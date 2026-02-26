"use client"
import { useState, useEffect, useRef } from "react";
import { ChatStatus } from "ai";
import { BsPaperclip, BsFileEarmarkPdfFill, BsFillFileEarmarkImageFill, BsFileEarmarkTextFill} from "react-icons/bs";
import { TiTimes } from "react-icons/ti";
import {  IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5"
import { FileUploadState } from "@/lib/types";



interface ChatFormProps {
    input: string;
    setInput: (value: string) => void;
    files?: FileList | undefined;
    fileUploadStates?: FileUploadState[];
    isUploadingFiles?: boolean;
    hasUploadErrors?: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>; 
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile?: (index: number) => void;
    status?: ChatStatus;
    isSending?: boolean;
    handleStop?: () => void;
    handleSubmit: (e: React.SubmitEvent) => void;
}

export default function ChatForm({ 
    input, 
    setInput, 
    files,
    fileInputRef,
    fileUploadStates,
    isUploadingFiles,
    hasUploadErrors,
    onFileChange,
    onRemoveFile,
    status = "ready", 
    isSending,
    handleStop, 
    handleSubmit 
}: ChatFormProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const filePreviewRef = useRef<HTMLDivElement>(null);
    const [showIndicator, setShowIndicator] = useState(false);
    const [indicatorDirection, setIndicatorDirection] = useState<'left' | 'right'>('right');

    // Reset height when input is cleared
    useEffect(() => {
        if (input === "" && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [input]);

    // Add scroll event handler for file preview
    const handleFileScroll = () => {
        if (filePreviewRef.current && files && files.length > 0) {
            const container = filePreviewRef.current;
            const isAtStart = container.scrollLeft <= 1;
            const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
            
            if (isAtStart) {
                setIndicatorDirection('right');
                setShowIndicator(true);
            } else if (isAtEnd) {
                setIndicatorDirection('left');
                setShowIndicator(true);
            } else {
                setShowIndicator(true);
                setIndicatorDirection('right'); 
            }
        }
    };

    // handle file preview scroll indicator
    useEffect(() => {
        if (filePreviewRef.current && files && files.length > 0) {
            const container = filePreviewRef.current;
            const hasOverflow = container.scrollWidth > container.clientWidth;
            setShowIndicator(hasOverflow);
        } else {
            setShowIndicator(false);
        }
    }, [files]);

    const scrollToEnd = (direction: 'left' | 'right') => {
        if (filePreviewRef.current) {
            const container = filePreviewRef.current;
            const scrollAmount = direction === 'right' ? container.scrollWidth : -container.scrollWidth;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleInput = (e: React.InputEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = Math.min(target.scrollHeight, 200) + 'px'; 
    };

    const handleEnterKeySubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
    };
    
    return (
        <form className="w-full mx-auto px-4" onSubmit={handleSubmit}>
            <div className="bg-white border border-gray-300 px-[10px] py-[10px] rounded-3xl shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 gap-2">
                 {/* File Preview Area */}
                 {files && files.length > 0 && (
                    <div className="relative">
                        <div ref={filePreviewRef} onScroll={handleFileScroll} className="px-2 py-2 flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide">
                            {Array.from(files).map((file, index) => {
                            const uploadState = fileUploadStates?.[index];
                            const isUploading = uploadState?.status === 'uploading';
                            const isError = uploadState?.status === 'error';
                            const isSuccess = uploadState?.status === 'success';

                            return (
                                <div 
                                key={index} 
                                className={`flex items-center rounded-[10px] px-[10px] border py-2 text-sm transition-colors ${
                                    isError 
                                    ? 'border-red-400 bg-red-50' 
                                    : isSuccess 
                                    ? 'border-green-400 bg-green-50' 
                                    : isUploading
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-300'
                                }`}
                                >
                                {/* File icon */}
                                <span className={`mr-[5px] text-[20px] ${
                                    isError ? 'text-red-500' :
                                    isSuccess ? 'text-green-500' :
                                    file.type.startsWith('image/') ? 'text-[#9999ff]' : 
                                    file.type === 'application/pdf' ? 'text-[#ff0000]' : 'text-[#0000ff]'
                                }`}>
                                    {file.type.startsWith('image/') ? <BsFillFileEarmarkImageFill/> : 
                                    file.type === 'application/pdf' ? <BsFileEarmarkPdfFill/> : <BsFileEarmarkTextFill/>}
                                </span>

                                {/* File name */}
                                <span className="truncate max-w-[150px] text-gray-800">
                                    {file.name}
                                </span>

                                {/* Status indicator */}
                                <span className="ml-2 text-xs">
                                    {isUploading && (
                                    <span className="text-blue-500 flex items-center gap-1">
                                        <span className="loader-xs"></span> uploading...
                                    </span>
                                    )}
                                    {isError && (
                                    <span className="text-red-500" title={uploadState?.errorMessage}>
                                        ✕ failed
                                    </span>
                                    )}
                                    {isSuccess && (
                                    <span className="text-green-500">✓ uploaded</span>
                                    )}
                                    {!uploadState && (
                                    <span className="text-gray-500">({(file.size / 1024).toFixed(1)}KB)</span>
                                    )}
                                </span>

                                {/* Remove button - only show when not uploading */}
                                {onRemoveFile && !isUploading && (
                                    <button
                                    type="button"
                                    onClick={() => onRemoveFile(index)}
                                    className={`ml-2 h-[20px] w-[20px] rounded-[50%] flex items-center justify-center text-[#fff] text-[14px] ${
                                        isError ? 'bg-red-500' : 'bg-[#000]'
                                    }`}
                                    aria-label={`Remove ${file.name}`}
                                    >
                                    <TiTimes/>
                                    </button>
                                )}
                                </div>
                            );
                            })}
                        </div>
                        {showIndicator && ( <div className={`bg-[#fff] absolute ${indicatorDirection === 'right' ? 'right-[0px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]' : 'left-[0px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]'} top-[0px] w-[35px] bottom-[0px] z-10 flex items-center justify-center`}>
                                <button type="button" className="text-[#000] cursor-pointer w-[26.5px] h-[26.5px] rounded-[50%] flex items-center justify-center bg-transparent hover:bg-[#dcdcdc] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => scrollToEnd(indicatorDirection)} disabled={status === "streaming" || isSending}>
                                    <span className="font-bold text-[20px]">{indicatorDirection === 'right' ? <IoChevronForwardOutline/> : <IoChevronBackOutline/>}</span>
                                </button>
                            </div>
                           
                        )}
                    </div> 
                )}
                <textarea
                    ref={textareaRef}
                    className="scrollbar-thin px-4 pr-12 resize-none outline-none rounded-2xl overflow-y-auto text-gray-800 placeholder-gray-500 w-full max-h-[200px]"
                    placeholder="Message AI..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleEnterKeySubmit}
                    rows={1}
                    aria-label="Chat message"
                />

                <div className='flex justify-between'>
                    <label className="group relative flex justify-center items-center h-[35px] w-[35px] rounded-[50%] bg-transparent hover:bg-[#2D374812] text-[#2D3748] cursor-pointer">
                        <BsPaperclip className="text-[17px]"/>
                        <span className="absolute -top-10 hidden opacity-0 text-white text-[10px] whitespace-nowrap bg-black py-1.5 px-2.5 border border-[#3c3c3c] rounded-[5px] shadow-[0_5px_10px_rgba(0,0,0,0.596)] transition-all duration-300 group-hover:block group-hover:opacity-100">
                            Add a file
                        </span>
                        <input 
                            className="hidden" 
                            type="file" 
                            name="file" 
                            onChange={onFileChange}
                            ref={fileInputRef}
                            multiple
                            aria-label="Attach file"
                        />
                    </label>
            
                    {status === "streaming" ? (
                        <button 
                            type="button"
                            className="text-[#fff] bg-[#2D3748] rounded-[50%] h-[40px] w-[40px] font-bold text-[18px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Stop AI response"
                            onClick={handleStop}
                        >
                            <span className="streaming h-[10px] w-[10px] bg-[#fff]"></span>     
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            className="text-[#fff] bg-[#2D3748] rounded-[50%] h-[35px] w-[35px] font-bold text-[18px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={status !== "ready" || !input.trim()}
                            aria-label={
                                !input.trim() ? "Type a message to send" :
                                (status === "submitted" || isSending) ? "Message sending..." :
                                "Send message"
                            }
                        >
                            {status === "submitted" || isSending ? (
                                <span className="loader"></span>
                            ) : "↑"}
                        </button>
                    )}
                </div>
            </div>
        </form>   
    );
}