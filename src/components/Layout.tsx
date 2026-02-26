"use client"
import Image from "next/image";
import { useEffect } from "react";
import ChatSidebar, { ProfileIcon } from "./ChatSidebar";
import {SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, useSidebar} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import Link from "next/link";

export default function PagesLayout({ children, footer }: Readonly<{ children: React.ReactNode, footer: React.ReactNode }>) {
    return (
        <SidebarProvider defaultOpen={true}>
            <ComponentLayout footer={footer}>
                {children}
            </ComponentLayout>
        </SidebarProvider>
    );
}


function ComponentLayout({children, footer}: Readonly<{children: React.ReactNode, footer:React.ReactNode;}>) {
    const { open, setOpen, isMobile } = useSidebar();
    const router = useRouter();

    useEffect(() => {
        const sessionState = sessionStorage.getItem("OpenedSideBar")
        if (sessionState){
            if(sessionState === "open"){
                setOpen(true)
            }else{
                setOpen(false)
            }
        }else{
            sessionStorage.setItem("OpenedSideBar", "open");
            setOpen(true);
        }
    },[])
  
    const handleToggler = () => {
        const newState = !open;
        sessionStorage.setItem("OpenedSideBar", newState ? "open" : "close");
        setOpen(newState);
    };

    const handleNewChat = () => {
        router.push('/chat');
    };

  return (
    <SidebarProvider defaultOpen={true} open={open} onOpenChange={handleToggler}>
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="!bg-primary-color">
            <SidebarHeader className={`flex flex-row items-center gap-x-[6px] p-[10px] h-header shadow-md ${isMobile ? "justify-between" : "justify-start"}`}>
                <Link href="/">
                    <div className="flex flex-row items-center gap-x-[6px]">
                        <Image src="/tripmate_white.png" alt="TripMate Logo" width={75} height={80} priority className="md:w-[70px] w-[50px]"/>
                        <span className="text-white md:text-[1.8rem] text-[1.2rem] description">TripMate</span>
                    </div>
                </Link>
                {isMobile && (
                    <SidebarTrigger className="text-white hover:text-white !text-2xl"/>
                )}
            </SidebarHeader>
            <SidebarContent className="px-10 px-2">
                <ChatSidebar />
            </SidebarContent>
            <SidebarFooter className="px-2 mb-2">
                <ProfileIcon role="footer"/>
            </SidebarFooter>
        </Sidebar>
        <div className="app overflow-y-auto overflow-x-hidden" id="chat-scroll-container">
            <header className={`h-header shadow-md bg-white flex items-center sticky top-0 z-10 border-b border-[#E5E7EB] px-4 role="banner ${isMobile ? "justify-between" : "justify-start"}`}>
                {isMobile && (
                    <button onClick={handleNewChat} className="flex items-center gap-x-2 py-2 px-4 bg-purple-600 rounded-3xl hover:bg-purple-700 text-white transition-colors font-medium text-sm border-none outline-none">
                        <FiPlus className="w-4 h-4" />
                    </button>
                )}
                <SidebarTrigger className="text-primary-color hover:text-primary-color w-5 h-5 border-none outline-none"/>
            </header>
           
            <main className="px-4 min-h-main" role="main">
                {children}  
            </main>

            <footer className="py-[10px] px-4 sticky bottom-0 z-10 bg-background-color" role="contentinfo">
                {footer}
            </footer>
        </div>
    </SidebarProvider>
)}