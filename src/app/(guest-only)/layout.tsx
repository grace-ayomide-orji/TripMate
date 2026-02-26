'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

export default function GuestOnlyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    typeof window !== 'undefined' && sessionStorage.getItem('passwordRecovery') === 'true'
  )

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('passwordRecovery', 'true')
        setIsPasswordRecovery(true)
      }
      // Once they've successfully updated their password, clear the flag
      if (event === 'USER_UPDATED') {
        sessionStorage.removeItem('passwordRecovery')
        setIsPasswordRecovery(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    if (isPasswordRecovery) return

    if (user) {
      const destination = returnUrl ? decodeURIComponent(returnUrl) : '/chat'
      router.push(destination)
    }
  }, [user, loading, router, returnUrl, isPasswordRecovery])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="loader mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && !isPasswordRecovery) return null

  return <div className="relative">
    <div className="absolute top-5 left-5">
      <Image src="/tripmate_logo.png" alt="TripMate Logo" width={85} height={90} priority className="w-[80px]"/>
    </div>
    {children}
  </div>
}