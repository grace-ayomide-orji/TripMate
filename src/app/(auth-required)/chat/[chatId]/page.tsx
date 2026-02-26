"use client"
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useState, useEffect, useRef, SubmitEvent } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link'
import { useAuth } from "@/contexts/AuthContext";
import { BsPaperclip } from "react-icons/bs";
import PagesLayout from "@/components/Layout";
import ChatForm from "@/components/ChatForm";
import { hasExceededFreeLimit, getHistory } from "@/lib/store";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "@/lib/toast";
import { TripCardData, PackingListData, FileUploadState } from "@/lib/types";
import { consumePendingMessage } from "@/lib/pendingMessage";
import { uploadFilesToCloudinary } from "@/lib/uploadFilesToCloudinary";

export default function ExistingChat() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [fileUploadStates, setFileUploadStates] = useState<FileUploadState[]>([]);
  const isUploadingFiles = fileUploadStates.some(f => f.status === 'uploading');
  const hasUploadErrors = fileUploadStates.some(f => f.status === 'error');

  const [showLimitModal, setShowLimitModal] = useState(false)

  const { messages, setMessages, sendMessage, status, stop } = useChat({
      id: chatId,
      transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages }) {
          return {
          body: { messages, conversationId: chatId, userId: user?.id },
          };
      },
      }),
      onFinish: () => {
      window.dispatchEvent(new CustomEvent('refreshSidebar'));
      },
      onError: (error) => {
      console.error("Chat error:", error);
      },
  });

  useEffect(() => {
      const pending = consumePendingMessage();

      if (pending) {
        // Brand new chat — send the queued first message right away
        const payload = pending.fileParts.length > 0
            ? { parts: [{ type: 'text' as const, text: pending.text }, ...pending.fileParts] }
            : { text: pending.text };

        // Check localStorage first
        const alreadyUsed = localStorage.getItem("usedTripmateToken") === "true"
        if (alreadyUsed) {
          setShowLimitModal(true)
          return
        }

        if (!user) {
          return
        }
          
        hasExceededFreeLimit(user.id, chatId).then((exceeded) => {
          if (exceeded) {
            localStorage.setItem("usedTripmateToken", "true")
            setShowLimitModal(true)
            return
          }
          sendMessage(payload)
          localStorage.setItem("usedTripmateToken", "true")
        })

      }

      

      // Returning to an existing chat — load history from DB
      setIsLoadingHistory(true);
      getHistory(chatId)
      .then((history) => {
          if (history.length > 0) {
          const uiMessages = history.map((msg) => ({
              id: crypto.randomUUID(),
              role: msg.role === "user" ? "user" : "assistant",
              parts: Array.isArray(msg.content)
              ? msg.content
              : [{ type: "text", text: msg.content }],
          } as UIMessage));
          setMessages(uiMessages);
          }
      })
      .catch((error) => {
          toast.error("Loading Failed", "Failed to load conversation history.", 5000);
          console.error(error);
      })
      .finally(() => setIsLoadingHistory(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = document.getElementById('chat-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 50;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const container = document.getElementById('chat-scroll-container');
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || status === "submitted" || status === "streaming") return;

      try {
      let fileParts: { type: "file"; mediaType: string; url: string }[] = [];
      if (files && files.length > 0) {
          const uploaded = await uploadFilesToCloudinary(files, setFileUploadStates);
          if (!uploaded || uploaded.length === 0) return;
          fileParts = uploaded;
      }

      setInput("");
      setFiles(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";

      shouldAutoScrollRef.current = true;
      const container = document.getElementById('chat-scroll-container');
      if (container) container.scrollTop = container.scrollHeight;

      const payload = fileParts.length > 0
          ? { parts: [{ type: "text" as const, text: trimmedInput }, ...fileParts] }
          : { text: trimmedInput };

      // Check localStorage first
      const alreadyUsed = localStorage.getItem("usedTripmateToken") === "true"
      if (alreadyUsed) {
        setShowLimitModal(true)
        return
      }
        
      // handles cleared localStorage / different device verify against DB 
      if (!user) return
      const exceeded = await hasExceededFreeLimit(user.id, chatId)
      if (exceeded) {
        localStorage.setItem("usedTripmateToken", "true")
        setShowLimitModal(true)
        return
      }
      
      await sendMessage(payload);
      } catch (error) {
      console.error("Failed to send message:", error);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      if (files && files.length > 0) {
      const dt = new DataTransfer();
      [...Array.from(files), ...Array.from(e.target.files)].forEach(f => dt.items.add(f));
      setFiles(dt.files);
      } else {
      setFiles(e.target.files);
      }
  };

  const handleRemoveFile = (index: number) => {
      const dt = new DataTransfer();
      Array.from(files || []).filter((_, i) => i !== index).forEach(f => dt.items.add(f));
      setFiles(dt.files);
  };

  return (
    <PagesLayout
      footer={
        <ChatForm
          input={input}
          setInput={setInput}
          fileInputRef={fileInputRef}
          fileUploadStates={fileUploadStates}
          isUploadingFiles={isUploadingFiles}
          hasUploadErrors={hasUploadErrors}
          files={files}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          status={status}
          handleStop={stop}
          handleSubmit={handleSubmit}
        />
      }
    >
      <div
        className="flex flex-col space-y-4 p-4">
        {isLoadingHistory ? (
          <div className="h-main flex items-center justify-center">
              <span className="loader h-50 w-50" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-main flex items-center justify-center text-center mt-10">
              <p className="md:text-3xl sm:text-xl text-lg text-primary-color">
              Start a conversation with TripMate!
              </p>
          </div>
        ) : (
          messages.map((message, index) => (
              <div
              key={`${message.id}-${index}`}
              className={`flex flex-col ${message.role === 'user' ? "items-end" : "items-start"}`}
              >
                <div className={`p-[10px] ${message.role === 'user' ? "max-w-[70%] w-fit bg-[#dadfe7] text-[#1a1f26] rounded-[15px]" : ""}`}>
                    {message.parts.map((part, i) => renderMessagePart(part, message.id, i))}
                </div>
              </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Demo Limit Reached</h2>
            <p className="text-gray-600 mb-6">
              This is a portfolio demo, API tokens are expensive so each visitor 
              gets one exchange. If you'd like to know more about this project or 
              discuss working together, feel free to reach out! oloruntobiga@gmail.com
            </p>
            <Link
              href="mailto:oloruntobiga@gmail.com"
              className="inline-block bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition mb-3 w-full"
            >
              Contact Me
            </Link>
            <button
              onClick={() => setShowLimitModal(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </PagesLayout>
  );
}

// ─── Message renderers ────────────────────────────────────────────────────────
function renderMessagePart(part: any, messageId: string, index: number) {
  if (part.type?.startsWith("tool-")) {
    const toolName = part.type.replace("tool-", "");
    const { state, input, output, errorText } = part;
    const stableKey = `${messageId}-tool-${index}`;

    switch (state) {
      case "input-streaming":
        return <div key={stableKey} className="text-sm italic text-gray-500">Preparing {toolName}...</div>;
      case "input-available":
        return <div key={stableKey} className="text-sm text-gray-700">Input for {toolName}: {JSON.stringify(input)}</div>;
      case "output-available":
        if (toolName === "create_trip_card") return renderTripCard(output, stableKey);
        if (toolName === "create_packing_list") return renderPackingList(output, stableKey);
        if (toolName === "weather") {
          return (
            <div key={stableKey} className="bg-blue-50 p-3 rounded-lg my-2">
              <strong>Weather in {output.location}:</strong> {output.temp}°C, {output.condition}
              {output.forecast && (
                <div className="mt-2 text-sm">
                  {output.forecast.map((day: any, i: number) => (
                    <div key={i}>{day.date}: {day.temp}°C, {day.condition}</div>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <div key={stableKey} className="bg-yellow-50 p-3 rounded-lg my-2">
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
          </div>
        );
      case "output-error":
        return <div key={stableKey} className="text-red-600">Error in {toolName}: {errorText}</div>;
      default:
        return null;
    }
  }

  switch (part.type) {
    case "reasoning":
      return (
        <div key={`${messageId}-reasoning-${index}`} className="border-l-2 border-purple-300 pl-3 my-1 text-xs italic text-gray-400 opacity-75">
          {part.text}
        </div>
      );
    case "text":
      return (
        <div
          key={`${messageId}-text-${index}`}
          className="prose prose-sm max-w-none
            prose-headings:text-purple-900 prose-headings:font-bold
            prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-3
            prose-strong:text-purple-700 prose-strong:font-semibold
            prose-ul:my-2 prose-ul:space-y-1
            prose-li:text-gray-700
            prose-p:text-gray-800 prose-p:leading-relaxed
            prose-li:marker:text-purple-500
            [&>*:first-child]:mt-0"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
        </div>
      );
    case "file": {
      const fileUrl = part.url || part.data;
      if (!fileUrl) return null;
      if (part.mediaType?.startsWith("image/")) {
        return (
          <Image
            key={`${messageId}-image-${index}`}
            src={fileUrl}
            alt={part.filename || part.name || `Image-${index}`}
            height={200}
            width={200}
            className="rounded-lg"
          />
        );
      }
      if (part.mediaType === "application/pdf") {
        return (
          <iframe
            key={`${messageId}-pdf-${index}`}
            src={fileUrl}
            width="100%"
            height="600"
            title={part.filename || part.name || `PDF-${index}`}
            className="border rounded-lg"
          />
        );
      }
      return (
        <div key={`${messageId}-file-${index}`} className="border p-2 rounded">
          <a href={part.url} download={part.filename || part.name} className="text-blue-600 hover:underline">
            <BsPaperclip /> {part.filename || part.name}
          </a>
        </div>
      );
    }
    default:
      return null;
  }
}

function renderTripCard(data: TripCardData, stableKey: string) {
  return (
    <div key={stableKey} className="relative overflow-hidden border border-purple-200 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-lg hover:shadow-xl transition-shadow duration-300 my-4">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">✈️</div>
          <div>
            <h3 className="text-2xl font-bold text-white">Trip to {data.city}</h3>
            {data.createdAt && (
              <p className="text-purple-100 text-sm mt-1">
                {new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6 space-y-5">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-700 leading-relaxed">{data.summary}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-lg">🎒</div>
            <h4 className="text-lg font-bold text-green-900">Packing Essentials</h4>
          </div>
          <ul className="space-y-2.5">
            {data.packingAdvice.map((item, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform">{i + 1}</div>
                <span className="text-gray-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {data.cautions?.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-lg animate-pulse">⚠️</div>
              <h4 className="text-lg font-bold text-red-900">Important Cautions</h4>
            </div>
            <ul className="space-y-2.5">
              {data.cautions.map((caution, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2" />
                  <span className="text-gray-700 leading-relaxed">{caution}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
    </div>
  );
}

function renderPackingList(data: PackingListData, stableKey: string) {
  return (
    <div key={stableKey} className="relative overflow-hidden border border-green-200 rounded-2xl bg-gradient-to-br from-green-50 via-white to-teal-50 shadow-lg hover:shadow-xl transition-shadow duration-300 my-4">
      <div className="bg-gradient-to-r from-green-600 to-teal-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">🎒</div>
            <div>
              <h3 className="text-2xl font-bold text-white">Your Packing List</h3>
              {data.createdAt && (
                <p className="text-green-100 text-sm mt-1">
                  {new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <p className="text-white font-bold">{data.totalItems} items</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-4">
          {data.items.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 text-white rounded-lg flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">{i + 1}</div>
                <div className="flex-grow">
                  <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-green-700 transition-colors">{item.item}</h4>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg flex-shrink-0">💡</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.reason}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded group-hover:border-green-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-2 bg-gradient-to-r from-green-500 via-teal-500 to-green-500" />
    </div>
  );
}