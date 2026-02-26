import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import StructuredData from "@/components/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trip-mate-v1.vercel.app'),
  title: {
    default: 'TripMate - AI-Powered Travel Planning Assistant',
    template: '%s | TripMate'
  },
  description: 'Plan smarter, travel brighter. TripMate is your AI-powered travel companion that helps you create personalized itineraries, discover hidden gems, and make your trips unforgettable.',
  keywords: ['travel planning', 'AI travel assistant', 'trip planner', 'itinerary generator', 'travel chatbot', 'vacation planning'],
  authors: [{ name: 'Grace Ayomide Orji' }],
  creator: 'TripMate',
  publisher: 'TripMate',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trip-mate-v1.vercel.app',
    title: 'TripMate - AI-Powered Travel Planning Assistant',
    description: 'Plan smarter, travel brighter with AI-powered travel planning.',
    siteName: 'TripMate',
    images: [
      {
        url: '/tripmate-social.jpg',
        width: 1200,
        height: 630,
        alt: 'TripMate - AI Travel Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripMate - AI-Powered Travel Planning Assistant',
    description: 'Plan smarter, travel brighter with AI-powered travel planning.',
    images: ['/tripmate-social.jpg'],
    creator: '@grace_builds',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-96x96.png',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
            {children}
        </AuthProvider>
        <Toaster 
          position="top-right"
          expand={false}
          richColors={false}
          closeButton={false}
        />
      </body>
    </html>
  );
}