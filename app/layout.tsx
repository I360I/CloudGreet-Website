import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ClientWrapper from './components/ClientWrapper'
import { ThemeProvider } from './contexts/ThemeContext'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: {
    default: 'CloudGreet - AI Receptionist for HVAC, Painting & Roofing',
    template: '%s | CloudGreet'
  },
  description: 'Transform your business with CloudGreet\'s AI receptionist. Handle calls, schedule appointments, and manage customer inquiries 24/7 with maximum automation. Perfect for HVAC, Painting, and Roofing companies.',
  keywords: [
    'AI receptionist',
    'business automation',
    'HVAC automation',
    'painting business',
    'roofing company',
    'customer service automation',
    'appointment scheduling',
    'lead qualification',
    'call management',
    'business phone system'
  ],
  authors: [{ name: 'CloudGreet Team', url: 'https://cloudgreet.com' }],
  creator: 'CloudGreet',
  publisher: 'CloudGreet',
  metadataBase: new URL('https://cloudgreet.com'),
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cloudgreet.com',
    title: 'CloudGreet - AI Receptionist for Your Business',
    description: 'Transform your business with CloudGreet\'s AI receptionist. Handle calls, schedule appointments, and manage customer inquiries 24/7 with maximum automation.',
    siteName: 'CloudGreet',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CloudGreet AI Receptionist Platform - Professional business automation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CloudGreet - AI Receptionist for Your Business',
    description: 'Transform your business with CloudGreet\'s AI receptionist. Handle calls, schedule appointments, and manage customer inquiries 24/7 with maximum automation.',
    images: ['/og-image.jpg'],
    creator: '@cloudgreet',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        {/* PerformanceMonitor disabled to fix Next.js errors */}
        <ThemeProvider>
          <Providers>
            <ClientWrapper>
              {children}
            </ClientWrapper>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
