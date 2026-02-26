'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllConversations, deleteConversation, type ConversationListItem } from '@/lib/store';
import { FiTrash2, FiPlus, FiLogOut } from 'react-icons/fi';
import { BsThreeDots } from 'react-icons/bs';
import { IoPersonOutline } from 'react-icons/io5';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/CustomDialogs';

interface ConversationWithOptimistic extends ConversationListItem {
  isOptimistic?: boolean;
}

const STORAGE_PREFIX = 'tripmate-sidebar-';

const getStorageKey = (userId: string) => {
  return `${STORAGE_PREFIX}${userId}`;
};

export default function ChatSidebar() {
  const [conversations, setConversations] = useState<ConversationWithOptimistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    conversationId: '',
  });

  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const currentChatId = params?.chatId;
  const { user } = useAuth();
  
  // Load conversations when user changes
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    } else {
      setConversations([]);
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith(STORAGE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        });
      }
    }
  }, [user?.id]);

  // Restore from sessionStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    const storageKey = getStorageKey(user.id);
    const cached = sessionStorage.getItem(storageKey);

    if (cached) {
      try {
        setConversations(JSON.parse(cached));
        setLoading(false);
      } catch {
        // fall through to load from DB
      }
    }
  }, [user?.id]);


  const loadConversations = async (silent = false) => {
    if (!user?.id) return;

    try {
      if (!silent) setLoading(true);
      const data = await getAllConversations(user.id);

      // Merge with existing optimistic entries so they don't flash away
      // while the DB request is in-flight
      setConversations(prev => {
        const optimisticEntries = prev.filter(c => c.isOptimistic);
        const merged = data.map(dbConv => {
          const optimistic = optimisticEntries.find(o => o.id === dbConv.id);
          // If DB title is null but we have an optimistic title, keep it
          if (optimistic && !dbConv.title) {
            return { ...dbConv, title: optimistic.title, isOptimistic: false };
          }
          return dbConv;
        });
        // Keep any optimistic entries not yet confirmed in DB
        optimisticEntries.forEach(o => {
          if (!merged.some(f => f.id === o.id)) {
            merged.unshift(o);
          }
        });
        return merged;
      });

      // Write only real DB data to cache — optimistic entries are transient
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(getStorageKey(user.id), JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations. Please refresh.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const handleNewConversation = (e: Event) => {
      const customEvent = e as CustomEvent<ConversationWithOptimistic>;
      const newConv = customEvent.detail;
      setConversations(prev => {
        if (prev.some(c => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
    };

    const handleRefresh = () => {
      if (user?.id) {
        loadConversations(true); 
      }
    };

    window.addEventListener('newConversation', handleNewConversation);
    window.addEventListener('refreshSidebar', handleRefresh);

    return () => {
      window.removeEventListener('newConversation', handleNewConversation);
      window.removeEventListener('refreshSidebar', handleRefresh);
    };
  }, [user?.id]);

  const handleChatClick = (conversationId: string) => {
    router.replace(`/chat/${conversationId}`);
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, conversationId });
  };

  const handleConfirmDelete = async () => {
    const { conversationId } = deleteDialog;
    try {
      const success = await deleteConversation(conversationId);
      if (success) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        if (conversationId === currentChatId) {
          router.push('/chat');
        }

        toast.success('Conversation deleted successfully');

        // Update cache
        if (user?.id) {
          const updated = conversations.filter(
            c => c.id !== conversationId && !c.isOptimistic
          );
          sessionStorage.setItem(getStorageKey(user.id), JSON.stringify(updated));
        }
      
      } else {
        toast.error('Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setDeleteDialog({ open: false, conversationId: '' });
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full [&>*]:!text-white">
      {/* New Chat Button */}
      <div className="py-3 px-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 rounded-3xl hover:bg-purple-700 transition-colors font-medium text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col gap-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-5">
            <p className="text-sm font-medium">No conversations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleChatClick(conversation.id)}
                className={`group/item flex items-center relative px-2 py-1 rounded-lg cursor-pointer transition-all ${
                  currentChatId === conversation.id
                    ? 'bg-[#ded7fb]/20 border border-[#ded7fb]/40 shadow-sm'
                    : 'hover:bg-[#ded7fb]/20 border border-transparent'
                }`}
              >
                <p className="flex-1 truncate">
                  {conversation.title || 'Untitled Conversation'}
                </p>

                {!conversation.isOptimistic && (
                  <button
                    onClick={(e) => handleDelete(conversation.id, e)}
                    className="opacity-0 group-hover/item:opacity-100 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all flex-shrink-0"
                    aria-label="Delete conversation"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, conversationId: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        message="Delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

export function ProfileIcon({ className, role }: { className?: string; role?: string }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      // Clear sessionStorage on logout
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith(STORAGE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        });
      }

      await signOut();
      router.push('/authenticate?mode=signIn');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  const initials = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase();

  return (
    <div className={className} role={role}>
      <div
        ref={dropdownRef}
        className="group/profile relative flex items-center gap-x-2 py-1 px-2 h-fit hover:bg-[#ded7fb]/20 rounded-lg border border-transparent"
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
      >
        <div className="flex items-center text-primary-color text-lg w-8 h-8 rounded-full justify-center p-[5px] bg-white cursor-pointer">
          {initials || <IoPersonOutline />}
        </div>
        <span className="text-white text-sm flex-1 truncate">
          {user?.user_metadata?.full_name || 'Profile'}
        </span>
        <div className="opacity-0 group-hover/profile:opacity-100 text-white rounded-full px-1 transition-all flex-shrink-0">
          <BsThreeDots />
        </div>

        {showDropdown && (
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* <div className="border-t border-gray-200 my-1" /> */}
              <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>Logout</span>
              </button>
          </div>
        )}
      </div>
    </div>
  );
}