import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from './contexts/ToastContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://cloudgreet.ai'),
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
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE || '',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CloudGreet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      // Service worker registered successfully
                    })
                    .catch(function(registrationError) {
                      // Service worker registration failed
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} overscroll-none bg-slate-900`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
