// "use client"
// import Image from "next/image";
// import { useChat } from "@ai-sdk/react";
// import { DefaultChatTransport, UIMessage } from "ai";
// import { useParams, useRouter } from "next/navigation";
// import { useState, useEffect, useRef, FormEvent, useMemo } from "react";
// import { BsPaperclip } from "react-icons/bs";
// import PagesLayout from "@/components/Layout";
// import ChatForm from "@/components/ChatForm";
// import { useAuth } from "@/contexts/AuthContext";
// import { getHistory } from "@/lib/store";
// import ReactMarkdown from 'react-markdown'
// import remarkGfm from 'remark-gfm'
// import { toast } from "@/lib/toast";
// import { User } from "@supabase/supabase-js";


// interface TripCardData {
//   city: string;
//   summary: string;
//   packingAdvice: string[];
//   cautions: string[];
//   createdAt?: string;
// }

// interface PackingItemData {
//   item: string;
//   reason: string;
// }

// interface PackingListData {
//   items: PackingItemData[];
//   totalItems: number;
//   createdAt?: string;
// }

// type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

// interface FileUploadState {
//   file: File;
//   status: FileStatus;
//   errorMessage?: string;
//   uploadedUrl?: string;
// }

// export default function DynamicChat() {
//   const params = useParams<{ chatId?: string[] }>();
//   const { user } = useAuth();

//   const chatIdFromUrl = params.chatId?.[0];
  
//   return <ChatComponent chatIdFromUrl={chatIdFromUrl} user={user} />;
// }

// function ChatComponent({chatIdFromUrl, user}: {chatIdFromUrl: string | undefined, user: User | null}) {
 
//   const generatedIdRef = useRef<string | null>(null);
//   const chatId = useMemo(() => {
//     if (chatIdFromUrl) return chatIdFromUrl;
//     if (!generatedIdRef.current) {
//       generatedIdRef.current = crypto.randomUUID();
//     }
//     return generatedIdRef.current;
//   }, [chatIdFromUrl]);

//   const loadedIdRef = useRef<string | null>(null);

//   const [input, setInput] = useState("");
//   const [files, setFiles] = useState<FileList | undefined>(undefined);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

//   const [isLoadingHistory, setIsLoadingHistory] = useState(false);

//   const [fileUploadStates, setFileUploadStates] = useState<FileUploadState[]>([]);
//   const isUploadingFiles = fileUploadStates.some(f => f.status === 'uploading');
//   const hasUploadErrors = fileUploadStates.some(f => f.status === 'error');

//   const router = useRouter()

//   // useChat hook to send messages to the server
//   const { messages, setMessages, sendMessage, status, stop} = useChat({
//     id: chatId,
//     transport: new DefaultChatTransport({
//       api: "/api/chat",
//       prepareSendMessagesRequest({ messages }) {
//         return {
//           body: {
//             messages: messages,          
//             conversationId: chatId,
//             userId: user?.id,
//           },
//         };
//       }
//     }),
//     onFinish: () => {
//       window.dispatchEvent(new CustomEvent('refreshSidebar'));
//     },
//     onError: (error) => {
//       console.error("Chat error:", error);
//     }
//   });

//   // Load history for existing chat, or clear for new chat
//   useEffect(() => {
//     // No chat ID in URL
//     if (!chatIdFromUrl) {
//       const isGenuinelyNewChat = window.location.pathname === '/chat';
//       if (!isGenuinelyNewChat) return; 
//       setMessages([]);
//       generatedIdRef.current = null;
//       loadedIdRef.current = null;
//       return;
//     }
  
//     // If the loaded ID doesn't match the URL ID, load that conversation's history
//     if (loadedIdRef.current !== chatIdFromUrl) {
//       setMessages([]);          
//       setIsLoadingHistory(true);
  
//       getHistory(chatIdFromUrl)
//         .then((history) => {
//           if (history.length > 0) {
//             const uiMessages = history.map((msg) => ({
//               id: crypto.randomUUID(),
//               role: msg.role === "user" ? "user" : "assistant",
//               parts: Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }],
//             } as UIMessage));
//             setMessages(uiMessages);
//           }
//           loadedIdRef.current = chatIdFromUrl;
//         })
//         .catch((error) => {
//           toast.error("Loading Failed", "Failed to load conversation history.", 5000);
//           console.error(error);
//         })
//         .finally(() => setIsLoadingHistory(false));
//     }

//   }, [chatIdFromUrl, setMessages]);

//   useEffect(() => {
//     if (shouldAutoScroll && messages.length > 0) {
//       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [messages, shouldAutoScroll]);

//   // handleSubmit to send the message to the server
//   const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
    
//     const trimmedInput = input.trim();
//     if (!trimmedInput || status === "submitted" || status === "streaming") return;
//     const filesToUpload = files;
      
//     try {
      
//       // upload files to Cloudinary if there are any
//       let fileParts: { type: "file"; mediaType: string; url: string }[] = [];
//       if (filesToUpload && filesToUpload.length > 0) {
        
//         try {
//           const uploaded = await uploadFilesToCloudinary(filesToUpload);
          
//           if (!uploaded || uploaded.length === 0) {
//             console.error("File upload failed. Please try again.");
//             return;
//           } 
//           fileParts = uploaded;
//         } catch (uploadError) {
//           console.error("File upload error:", uploadError);
//           return;
//         }
//       }

//       setInput("");
//       setFiles(undefined);
//       if (fileInputRef.current) fileInputRef.current.value = "";
      
//       // prepare message parts
//       const parts: Array<{
//         type: "text";
//         text: string;
//       }> = [{ type: "text", text: trimmedInput }];

//       // add file parts if any (safe even if empty)
//       const messagePayload = fileParts.length > 0
//         ? { parts: [...parts, ...fileParts] }
//         : { text: trimmedInput };

//       // send message to the server
//       await sendMessage(messagePayload);

//       // First message in a new chat — update the URL so Next.js params stay in sync
//       if (!chatIdFromUrl) {
//         router.replace(`/chat/${chatId}`)
//         // window.history.replaceState({ chatId }, '', `/chat/${chatId}`);

//         window.dispatchEvent(new CustomEvent('newConversation', {
//           detail: {
//             id: chatId,
//             title: trimmedInput,
//             isOptimistic: true,
//           }
//         }));
//       }

//     } catch (error) {
//       console.error("Failed to send message:", error);
//     };
//   };

//   async function uploadFilesToCloudinary(filesToUpload: FileList) {
//     // Initialize all files as uploading
//     const initialStates: FileUploadState[] = Array.from(filesToUpload).map(file => ({
//       file,
//       status: 'uploading'
//     }));
//     setFileUploadStates(initialStates);
  
//     const results: ({ type: 'file'; mediaType: string; url: string } | null)[] = 
//       await Promise.all(
//         Array.from(filesToUpload).map(async (file, index) => {
//           try {
//             const formData = new FormData();
//             formData.append('file', file);
  
//             const response = await fetch('/api/upload', {
//               method: 'POST',
//               body: formData,
//             });
  
//             if (!response.ok) throw new Error('Upload failed');
  
//             const { files: uploadedFiles } = await response.json();
//             const uploadedUrl = uploadedFiles[0]?.url;
  
//             // Mark this file as success
//             setFileUploadStates(prev => {
//               const updated = [...prev];
//               updated[index] = { ...updated[index], status: 'success', uploadedUrl };
//               return updated;
//             });
  
//             return {
//               type: 'file' as const,
//               mediaType: file.type || 'application/octet-stream',
//               url: uploadedUrl,
//             };
//           } catch (error) {
//             // Mark this file as error
//             setFileUploadStates(prev => {
//               const updated = [...prev];
//               updated[index] = {
//                 ...updated[index],
//                 status: 'error',
//                 errorMessage: `Failed to upload ${file.name}`
//               };
//               return updated;
//             });
  
//             toast.error(`Failed to upload ${file.name}`);
//             return null;
//           }
//         })
//       );
  
//     return results.filter(Boolean) as { type: 'file'; mediaType: string; url: string }[];
//   }

//   const renderTripCard = (data: TripCardData, stableKey: string) => {
//     return (
//       <div 
//         key={stableKey} 
//         className="relative overflow-hidden border border-purple-200 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-lg hover:shadow-xl transition-shadow duration-300 my-4"
//       >
//         {/* Header with gradient overlay */}
//         <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5">
//           <div className="flex items-center gap-3">
//             <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">
//               ✈️
//             </div>
//             <div>
//               <h3 className="text-2xl font-bold text-white">Trip to {data.city}</h3>
//               {data.createdAt && (
//                 <p className="text-purple-100 text-sm mt-1">
//                   {new Date(data.createdAt).toLocaleDateString('en-US', { 
//                     month: 'short', 
//                     day: 'numeric', 
//                     year: 'numeric' 
//                   })}
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>
  
//         {/* Content */}
//         <div className="p-6 space-y-5">
//           {/* Summary */}
//           <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
//             <p className="text-gray-700 leading-relaxed">{data.summary}</p>
//           </div>
  
//           {/* Packing Advice */}
//           <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
//             <div className="flex items-center gap-2 mb-3">
//               <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-lg">
//                 🎒
//               </div>
//               <h4 className="text-lg font-bold text-green-900">Packing Essentials</h4>
//             </div>
//             <ul className="space-y-2.5">
//               {data.packingAdvice.map((item, index) => (
//                 <li key={index} className="flex items-start gap-3 group">
//                   <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 group-hover:scale-110 transition-transform">
//                     {index + 1}
//                   </div>
//                   <span className="text-gray-700 leading-relaxed">{item}</span>
//                 </li>
//               ))}
//             </ul>
//           </div>
  
//           {/* Cautions */}
//           {data.cautions && data.cautions.length > 0 && (
//             <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200">
//               <div className="flex items-center gap-2 mb-3">
//                 <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-lg animate-pulse">
//                   ⚠️
//                 </div>
//                 <h4 className="text-lg font-bold text-red-900">Important Cautions</h4>
//               </div>
//               <ul className="space-y-2.5">
//                 {data.cautions.map((caution, index) => (
//                   <li key={index} className="flex items-start gap-3">
//                     <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
//                     <span className="text-gray-700 leading-relaxed">{caution}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
  
//         {/* Bottom accent */}
//         <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500"></div>
//       </div>
//     );
//   };

//   const renderPackingList = (data: PackingListData, stableKey: string) => {
//     return (
//       <div 
//         key={stableKey} 
//         className="relative overflow-hidden border border-green-200 rounded-2xl bg-gradient-to-br from-green-50 via-white to-teal-50 shadow-lg hover:shadow-xl transition-shadow duration-300 my-4"
//       >
//         {/* Header */}
//         <div className="bg-gradient-to-r from-green-600 to-teal-600 p-5">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">
//                 🎒
//               </div>
//               <div>
//                 <h3 className="text-2xl font-bold text-white">Your Packing List</h3>
//                 {data.createdAt && (
//                   <p className="text-green-100 text-sm mt-1">
//                     {new Date(data.createdAt).toLocaleDateString('en-US', { 
//                       month: 'short', 
//                       day: 'numeric', 
//                       year: 'numeric' 
//                     })}
//                   </p>
//                 )}
//               </div>
//             </div>
//             <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
//               <p className="text-white font-bold">{data.totalItems} items</p>
//             </div>
//           </div>
//         </div>
  
//         {/* Items Grid */}
//         <div className="p-6">
//           <div className="grid gap-4">
//             {data.items.map((item, index) => (
//               <div 
//                 key={index} 
//                 className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 group"
//               >
//                 <div className="flex items-start gap-4">
//                   {/* Item Number Badge */}
//                   <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 text-white rounded-lg flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
//                     {index + 1}
//                   </div>
  
//                   {/* Item Content */}
//                   <div className="flex-grow">
//                     <h4 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-green-700 transition-colors">
//                       {item.item}
//                     </h4>
//                     <div className="flex items-start gap-2">
//                       <span className="text-yellow-500 text-lg flex-shrink-0">💡</span>
//                       <p className="text-gray-600 text-sm leading-relaxed">
//                         {item.reason}
//                       </p>
//                     </div>
//                   </div>
  
//                   {/* Checkbox for user interaction (optional) */}
//                   <div className="flex-shrink-0">
//                     <div className="w-6 h-6 border-2 border-gray-300 rounded group-hover:border-green-500 transition-colors"></div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
  
//         {/* Bottom accent */}
//         <div className="h-2 bg-gradient-to-r from-green-500 via-teal-500 to-green-500"></div>
//       </div>
//     );
//   };

//   const renderMessagePart = (part: any, messageId: string, index: number) => {
//     if (part.type && part.type.startsWith("tool-")) {
//       const toolName = part.type.replace("tool-", "");
//       const { state, input, output, toolCallId, errorText } = part;
//       const stableKey = `${messageId}-tool-${index}`;

//       switch (state) {
//         case "input-streaming":
//           return (
//             <div key={stableKey} className="text-sm italic text-gray-500">
//               Preparing {toolName}...
//             </div>
//           );
//         case "input-available":
//           return (
//             <div key={stableKey} className="text-sm text-gray-700">
//               Input for {toolName}: {JSON.stringify(input)}
//             </div>
//           );
//         case "output-available":
//           if (toolName === "create_trip_card") {
//             return renderTripCard(output, stableKey);
//           }
//           if (toolName === "create_packing_list") {
//             return renderPackingList(output, stableKey);
//           }
//           if (toolName === "weather") {
//             // Example weather display – adapt as needed
//             return (
//               <div key={stableKey} className="bg-blue-50 p-3 rounded-lg my-2">
//                 <strong>Weather in {output.location}:</strong> {output.temp}°C, {output.condition}
//                 {output.forecast && (
//                   <div className="mt-2 text-sm">
//                     {output.forecast.map((day: any, i: number) => (
//                       <div key={i}>
//                         {day.date}: {day.temp}°C, {day.condition}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           }
//           // Fallback for any other tool
//           return (
//             <div key={stableKey} className="bg-yellow-50 p-3 rounded-lg my-2">
//               <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
//             </div>
//           );
//         case "output-error":
//           return (
//             <div key={stableKey} className="text-red-600">
//               Error in {toolName}: {errorText}
//             </div>
//           );
//         default:
//           return null;
//       }
//     }
//     switch (part.type) {
//       case "reasoning":
//         return (
//           <div
//             key={`${messageId}-reasoning-${index}`}
//             className="text-sm italic opacity-75 text-gray-500"
//           >
//             {part.text}
//           </div>
//         );
//       case "text":
//         return (
//           <div
//             key={`${messageId}-text-${index}`}
//             className="prose prose-sm max-w-none 
//               prose-headings:text-purple-900 prose-headings:font-bold
//               prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-3
//               prose-strong:text-purple-700 prose-strong:font-semibold
//               prose-ul:my-2 prose-ul:space-y-1
//               prose-li:text-gray-700
//               prose-p:text-gray-800 prose-p:leading-relaxed
//               prose-li:marker:text-purple-500
//               [&>*:first-child]:mt-0"
//           >
//             <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
//           </div>
//         );
//       case "file": {
//         const fileUrl = part.url || (part as any).data;
//         if (!fileUrl) {
//           console.warn("File part has no URL/data:", part);
//           return null;
//         }

//         if (part.mediaType?.startsWith("image/")) {
//           return (
//             <Image
//               key={`${messageId}-image-${index}`}
//               src={fileUrl}
//               alt={part.filename || part.name || `Image-${index}`}
//               height={200}
//               width={200}
//               className="rounded-lg"
//             />
//           );
//         }
//         if (part.mediaType === "application/pdf") {
//           return (
//             <iframe
//               key={`${messageId}-pdf-${index}`}
//               src={fileUrl}
//               width="100%"
//               height="600"
//               title={part.filename || part.name || `PDF-${index}`}
//               className="border rounded-lg"
//             />
//           );
//         }
//         return (
//           <div key={`${messageId}-file-${index}`} className="border p-2 rounded">
//             <a
//               href={part.url!}
//               download={part.filename || part.name}
//               className="text-blue-600 hover:underline"
//             >
//               <BsPaperclip /> {part.filename || part.name}
//             </a>
//           </div>
//         );
//       }
//       default:
//         return null;
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       if (files && files.length > 0) {
//         // Append new files to existing ones
//         const currentFiles = Array.from(files);
//         const newFiles = Array.from(e.target.files);
//         const combinedFiles = [...currentFiles, ...newFiles];
        
//         const dt = new DataTransfer();
//         combinedFiles.forEach(file => dt.items.add(file));
//         setFiles(dt.files);
//       } else {
//         // No existing files, just set new ones
//         setFiles(e.target.files);
//       }
//     }
//   };

//   const handleRemoveFile = (index: number) => {
//     const newFiles = Array.from(files || []).filter((_, i) => i !== index);
//     const dt = new DataTransfer();
//     newFiles.forEach(file => dt.items.add(file));
//     setFiles(dt.files);
//   };

//   return (
//     <PagesLayout 
//       footer={   
//         <ChatForm 
//           input={input}
//           setInput={setInput}
//           fileInputRef={fileInputRef}
//           fileUploadStates={fileUploadStates}
//           isUploadingFiles={isUploadingFiles}
//           hasUploadErrors={hasUploadErrors} 
//           files={files}
//           onFileChange={handleFileChange}
//           onRemoveFile={handleRemoveFile}
//           status={status}
//           handleStop={stop}
//           handleSubmit={handleSubmit}
//         />
//       }
//     >
//       <div className="flex flex-col space-y-4 p-4">
//         {messages.length === 0 ? (
//           <div className="h-main flex items-center justify-center text-center text-gray-500 mt-10">
//              <p className="md:text-3xl sm:text-xl text-lg text-primary-color">Start a conversation with TripMate!</p>
//           </div>
//         ) : (
//           messages.map((message, index) => (
//             <div key={`${message.id}-${index}`} className={`flex flex-col ${message.role === 'user' ? "items-end" : "items-start"}`}>
//               <div className={`p-[10px] ${message.role === 'user' ? "max-w-[70%] w-fit bg-[#dadfe7] text-[#1a1f26] rounded-[15px]" : ""}`}>
//                   {message.parts.map((part, i) => renderMessagePart(part, message.id, i))}
//               </div>
//             </div>            
//           ))
//         )}
//         <div ref={messagesEndRef} />
//       </div>
//     </PagesLayout>
//   );
// }
