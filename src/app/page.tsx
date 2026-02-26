'use client'
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"

export default function LandingPage() {
    const { user } = useAuth()
    return(
        <div className="relative text-center bg-background-color h-[100svh] flex flex-col items-center justify-center">
            <div className="absolute top-5 left-5">
                <Image src="/tripmate_logo.png" alt="TripMate Logo" width={85} height={90} priority className="md:w-[75px]  w-[50px] "/>
            </div>
            
            <div className="travel-image-container bg-primary-color flex items-center justify-center lg:h-[350px] lg:w-[350px] md:h-[300px] md:w-[300px] h-[250px] w-[250px]">
                <Image 
                    src="/travel2.png" 
                    alt="Images of two travelers" 
                    width={85} 
                    height={90}  
                    priority
                    className="travel-image lg:w-[300px] md:w-[250px] w-[200px]"
                />
            </div>

            <p className="lg:text-[40px] md:text-[30px] text-[25px] text-primary-color my-[10px]">Welcome to TripMate!</p>
            
            <Link href={user ? "/chat" : "/authenticate?mode=signIn"} className="rounded-[13px] bg-primary-color text-white px-[15px] py-[10px] hover:bg-hover-color hover:text-white">Start Your Trip Planning</Link>
        </div>
    )
}