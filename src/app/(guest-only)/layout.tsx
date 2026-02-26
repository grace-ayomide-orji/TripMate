import { Suspense } from "react";
import { AuthLayoutComponent } from "./AuthLayout";
import { LoadingComponent } from "@/components/Loading";


export default function AuthLayout({children}:{children: React.ReactNode}){
  return(
    <Suspense fallback={<LoadingComponent/>}>
      <AuthLayoutComponent children={children}/>
    </Suspense>
  )
}