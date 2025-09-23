import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from './components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CloudGreet - AI Voice Assistant for HVAC, Roofing & Painting Contractors',
  description: 'Professional AI receptionist for service contractors. Handle calls 24/7, schedule appointments, provide estimates, and never miss another opportunity. Built specifically for HVAC, roofing, and painting businesses.',
  keywords: 'AI receptionist, HVAC contractor, roofing contractor, painting contractor, voice assistant, appointment scheduling, call handling, business automation',
  authors: [{ name: 'CloudGreet Team' }],
  creator: 'CloudGreet',
  publisher: 'CloudGreet',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'CloudGreet - Never Miss A Call Again',
    description: 'Professional AI receptionist for service contractors. Handle calls 24/7, schedule appointments, provide estimates.',
    url: 'https://cloudgreet.ai',
    siteName: 'CloudGreet',
    images: [
      {
        url: '/icon-192.png',
        width: 192,
        height: 192,
        alt: 'CloudGreet AI',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CloudGreet - Never Miss A Call Again',
    description: 'Professional AI receptionist for service contractors.',
    images: ['/icon-192.png'],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cloudgreet.ai'),
  alternates: {
    canonical: '/',
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
  verification: {
    google: '', // Google Analytics verification code (configure when needed)
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="overscroll-none">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/api/health" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://api.telnyx.com" />
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="preconnect" href="https://xpyrovyhktapbvzdxaho.supabase.co" />
        
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      </head>
      <body className={`${inter.className} overscroll-none bg-slate-900`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
