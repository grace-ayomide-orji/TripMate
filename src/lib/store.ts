import { supabase } from './supabase'
import type { ModelMessage, TextPart } from 'ai'

// Type for conversation list items
export interface ConversationListItem {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: string
  content: ModelMessage
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  messages: Message[]
}

/**
 * Get conversation history from database
 * @param conversationId - The unique ID of the conversation
 * @returns Array of messages for this conversation
 */
export async function getHistory(conversationId: string): Promise<ModelMessage[]> {
  try {
    // Query the database for messages
    const { data, error } = await supabase
      .from('messages')                              
      .select('content')                             
      .eq('conversation_id', conversationId)         
      .order('created_at', { ascending: true })     
      .limit(50)                                    
    
    // Handle errors
    if (error) {
      console.error('Database error fetching history:', error)
      return [] 
    }
    
    // return data.map(row => row.content as ModelMessage)
    const messages = data.map(row => row.content as ModelMessage);
    return messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => {
        if (msg.role === 'assistant' && 'toolInvocations' in msg) {
          // Remove toolInvocations to prevent "missing tool response" errors
          const { toolInvocations, ...cleanMsg } = msg as any;
          return {
            role: 'assistant',
            content: cleanMsg.content || ''
          } as ModelMessage;
        }
        return msg;
      });
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return []
  }
}


/**
 * Get all conversations for a specific user (for sidebar)
 * @param userId - User ID to filter conversations (required)
 * @returns Array of conversations with id, title, and timestamps
 */
export async function getAllConversations(userId: string): Promise<ConversationListItem[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId) 
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Database error fetching conversations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error fetching conversations:', error)
    return []
  }
}


/**
 * Generate a title from the first user message
 * @param conversationId - The conversation ID
 * @returns Generated title or null
 */

export async function generateConversationTitle(
  conversationId: string,
  supabaseClient = supabase
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    const message = data.content as ModelMessage
    let text = ''
    if (typeof message.content === 'string') {
      text = message.content
    } else if (Array.isArray(message.content)) {
      const textPart = message.content.find((part: any) => part.type === 'text')
      text = (textPart as TextPart)?.text || ''
    }

    const title = text.slice(0, 50).trim()
    return title ? (title.length === 50 ? title + '...' : title) : 'New Conversation'
  } catch (error) {
    console.error('Error generating title:', error)
    return 'New Conversation'
  }
}

/**
 * Update conversation title
 * @param conversationId - The conversation ID
 * @param title - The new title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
  supabaseClient = supabase
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)

    if (error) {
      console.error('Error updating conversation title:', error)
    }
  } catch (error) {
    console.error('Unexpected error updating title:', error)
  }
}
/**
 * Save conversation messages to database
 * @param conversationId - The unique ID of the conversation
 * @param messages - Array of all messages in the conversation
 * @param userId - User ID to associate with conversation (required)
 */

export async function setHistory(
  conversationId: string,
  messages: ModelMessage[],
  userId: string,
  supabaseClient = supabase  
): Promise<void> {
  try {
    const { data: existingConv } = await supabaseClient
      .from('conversations')
      .select('id, title')
      .eq('id', conversationId)
      .maybeSingle()

    const isNewConversation = !existingConv

    // Upsert conversation
    const { error: conversationError } = await supabaseClient
      .from('conversations')
      .upsert(
        {
          id: conversationId,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (conversationError) {
      console.error('Error upserting conversation:', conversationError)
      return
    }

    const { count } = await supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    const newMessages = messages.slice(count || 0)
    if (newMessages.length === 0) return

    const { error: messagesError } = await supabaseClient
      .from('messages')
      .insert(
        newMessages.map((msg) => ({
          conversation_id: conversationId,
          role: msg.role,
          content: msg,
        }))
      )

    if (messagesError) {
      console.error('Error inserting messages:', messagesError)
      return
    }

    if (isNewConversation) {
      const title = await generateConversationTitle(conversationId, supabaseClient)
      if (title) {
        await updateConversationTitle(conversationId, title, supabaseClient)
      }
    }
  } catch (error) {
    console.error('Unexpected error saving history:', error)
  }
}

/**
 * Delete a conversation and all its messages
 * @param conversationId - The conversation ID to delete
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    // First check if conversation exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    
    // If conversation doesn't exist, return true (nothing to delete)
    if (!existingConv) {
      return true;
    }
    
    // Delete the conversation (messages cascade automatically)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting conversation:', error);
    return false;
  }
}

export async function hasExceededFreeLimit(userId: string, conversationId: string): Promise<boolean> {
  // Check if this user already has a DIFFERENT conversation
  const { data: existingConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .neq('id', conversationId) 
    
    if (existingConversations && existingConversations.length > 0) {
      return true
    }

  // No other conversations — check if current one already has a user message
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('role', 'user')

  return (count ?? 0) >= 1
}