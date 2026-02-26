'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import { toast } from '@/lib/toast'

export function AuthComponent() {
    const { signIn, signUp } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')

    const urlMode = searchParams.get('mode') as 'signIn' | 'signUp' | null
    const [mode, setMode] = useState<'signIn' | 'signUp'>(urlMode || 'signIn')
    const [showPassword, setShowPassword] = useState(false)

    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isEmailLoading, setIsEmailLoading] = useState(false)

    const [showResendButton, setShowResendButton] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    

    // Update URL when mode changes
    const handleModeChange = (newMode: 'signIn' | 'signUp') => {
        setMode(newMode)
        router.push(`/authenticate?mode=${newMode}`)
    };

    // Sync state with URL changes (when user uses browser back/forward)
    useEffect(() => {
        if (urlMode && urlMode !== mode) {
        setMode(urlMode)
        }
    }, [urlMode])

    // Google Sign-In function
    const handleGoogleSignIn = async () => {
        try {
            setIsGoogleLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                redirectTo: `${window.location.origin}/chat`
                }
            })
            if (error) throw error
         } catch (err) {
            toast.error('Failed to sign in with Google', 'Authentication Failed')
        }finally {
            setIsGoogleLoading(false);
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsEmailLoading(true);

        try {
            if (!email.trim() || !password.trim()) {
                toast.error('Please fill in all fields', 'Authentication Failed')
                setIsEmailLoading(false);
                return;
            }

            if(!isValidEmail(email)) {
                toast.error('Invalid email address', 'Authentication Failed')
                setIsEmailLoading(false);
                return;
            }

            if (password.length < 8) {
                toast.error('Password must be at least 8 characters', 'Authentication Failed')
                setIsEmailLoading(false);
                return;
            }            
            
            if (mode === 'signUp') {
                await signUp({ 
                    email, 
                    password, 
                    fullName: fullName,
                })
                toast.success('Check your email to verify your account!', 'Account Created')
                handleModeChange('signIn');
                setPassword('');
            } else {
                await signIn(email, password)
                router.push('/chat');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
    
            // ✅ Detect unconfirmed email error
            if (errorMessage.includes('Email not confirmed') || 
                errorMessage.includes('not confirmed') ||
                errorMessage.toLowerCase().includes('confirm')) {
              toast.error('Your email is not confirmed yet. Check your inbox or request a new confirmation email.', 'Authentication Failed')
              setShowResendButton(true)
            } else if (errorMessage.includes('Invalid login credentials')) {
              toast.error('Invalid email or password. Please try again.', 'Authentication Failed')
            } else {
              toast.error(errorMessage, 'Authentication Failed')
            }
        } finally {
            setIsEmailLoading(false);
        };
    };

    const handleResendConfirmation = async () => {
        if (!email) {
          toast.error('Please enter your email address', 'Authentication Failed')
          return
        }
      
        setResendLoading(true)
      
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
          })
      
          if (error) throw error
      
          setShowResendButton(false)
          toast.success('Confirmation email sent! Check your inbox.', 'Email Sent')
          
        } catch (err) {
          toast.error('Failed to resend confirmation email. Please try again.', 'Email Failed')
        } finally {
          setResendLoading(false)
        }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-color p-4">
        <div className="relative max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-lg">

            <Link href="/" className="absolute top-5 left-5 flex items-center text-sm text-gray-600 hover:text-gray-900">
                <FiArrowLeft className='mr-2'/>
                Back to Home
            </Link>
        
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {mode === 'signIn' ? 'Welcome Back!' : 'Create Account'}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                {mode === 'signIn' 
                    ? 'Sign in to continue your trip planning' 
                    : 'Join TripMate to start planning amazing trips'
                }
                </p>
            </div>
            
            {/* Google Sign-In Button */}
            <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isEmailLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {
                    isGoogleLoading ? (
                        <span className="flex items-center justify-center gap-2 mx-10">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </span>
                    ) : (
                        <span className="font-medium text-sm md:text-lg">
                            {mode === 'signIn' ? 'Continue with Google' : 'Sign up with Google'}
                        </span>
                    )
                }
            </button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name (only for sign up) */}
                {mode === 'signUp' && (
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                        </label>
                        <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 hover:border-hover-color/50 focus:outline-none focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500  md:placeholder:text-md placeholder:text-sm transition-all"
                        />
                    </div>
                )}

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email address"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 hover:border-hover-color/50 focus:outline-none focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500  md:placeholder:text-md placeholder:text-sm transition-all"
                    />
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            minLength={6}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 hover:border-hover-color/50 focus:outline-none focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500  md:placeholder:text-md placeholder:text-sm transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 !focus:outline-none !bg-transparent !border-none"
                        >
                            {showPassword ? (
                                <FiEye className="w-4 h-4" />
                            ) : (
                                <FiEyeOff className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    {mode === 'signUp' && (
                        <p className="mt-1 text-xs text-gray-500">
                        Must be at least 8 characters
                        </p>
                    )}
                    {mode === 'signIn' && (
                        <p className="mt-1 text-xs text-gray-500">
                        <Link href="/forgot-password" className="text-primary-color hover:underline font-medium">
                            Forgot Password?
                        </Link>
                        </p>
                    )}
                </div>

                {/* Resend Confirmation Email Button */}
                {showResendButton && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800 mb-3">
                        Haven't received the confirmation email?
                        </p>
                        <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="w-fit py-1 px-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
                        >
                        {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
                        </button>
                    </div>
                )}

                {/* Submit Button */}
                <button
                type="submit"
                disabled={isEmailLoading || isGoogleLoading || !email.trim() || !password.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-color text-white font-medium rounded-md hover:bg-hover-color  disabled:cursor-not-allowed"
                >
                {isEmailLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    mode === 'signIn' ? 'Sign In' : 'Sign Up'
                )}
                </button>
            </form>

            {/* Toggle between Sign In / Sign Up */}
            <div className="text-center">
                <button
                onClick={() => handleModeChange(mode === 'signIn' ? 'signUp' : 'signIn')}
                className="text-sm text-primary-color hover:underline font-medium"
                >
                {mode === 'signIn' 
                    ? "Don't have an account? Sign up" 
                    : 'Already have an account? Sign in'}
                </button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-center text-gray-500">
                By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
        </div>
    </div>
  )
}