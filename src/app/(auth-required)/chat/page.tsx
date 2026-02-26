"use client"
import { useState, useRef, SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PagesLayout from "@/components/Layout";
import ChatForm from "@/components/ChatForm";
import { FileUploadState } from "@/lib/types";
import { setPendingMessage } from "@/lib/pendingMessage";
import { uploadFilesToCloudinary } from "@/lib/uploadFilesToCloudinary";

export default function NewChatPage() {
    const router = useRouter();
    const { user } = useAuth()
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<FileList | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileUploadStates, setFileUploadStates] = useState<FileUploadState[]>([]);
    const isUploadingFiles = fileUploadStates.some(f => f.status === 'uploading');
    const hasUploadErrors = fileUploadStates.some(f => f.status === 'error');
    const [isSending, setIsSending] = useState(false)
  
    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (!trimmedInput) return; 
        try{
        setIsSending(true)
        // Upload files first if any
        let fileParts: { type: 'file'; mediaType: string; url: string }[] = [];
        if (files && files.length > 0) {
            try {
            const uploaded = await uploadFilesToCloudinary(files, setFileUploadStates);
            if (!uploaded || uploaded.length === 0) return;
            fileParts = uploaded;
            } catch (error){
                console.log(error)
                return;
            }
        }

        setInput("")
        setFiles(undefined)
    
        const newChatId = crypto.randomUUID();
    
        // Stash the message — ExistingChat will consume it on mount
        setPendingMessage({ text: trimmedInput, fileParts });
    
        // Optimistically add to sidebar before the server confirms
        window.dispatchEvent(new CustomEvent('newConversation', {
            detail: { id: newChatId, title: trimmedInput, isOptimistic: true }
        }));

        if (user?.id) { 
          const storageKey = `tripmate-sidebar-${user.id}`;
          const cached = sessionStorage.getItem(storageKey);
          const existing = cached ? JSON.parse(cached) : [];
          sessionStorage.setItem(storageKey, JSON.stringify([
            { id: newChatId, title: trimmedInput, isOptimistic: true },
            ...existing
          ]));
        }

        router.push(`/chat/${newChatId}`);
        }catch(error){
            console.log(error)
            return
        }finally{
            setIsSending(false)
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
            status={"ready"}
            isSending={isSending}
            handleSubmit={handleSubmit}
          />
        }
      >
        <div className="h-main flex items-center justify-center text-center mt-10">
          <p className="md:text-3xl sm:text-xl text-lg text-primary-color">
            Start a conversation with TripMate!
          </p>
        </div>
      </PagesLayout>
    );
}