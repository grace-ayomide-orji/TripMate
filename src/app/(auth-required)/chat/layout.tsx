import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your AI travel assistant to plan your perfect trip.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}