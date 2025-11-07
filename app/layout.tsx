import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from './contexts/ToastContext'
import { RealtimeProvider } from './contexts/RealtimeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
  })
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://cloudgreet.com'),
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
    url: 'https://cloudgreet.com',
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
                    .);
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} overscroll-none bg-slate-900`}>
        <ErrorBoundary>
          <ToastProvider>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
          </ToastProvider>
        </ErrorBoundary>
      
        <footer className="bg-gray-800 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">CloudGreet</h3>
                <p className="text-gray-300">AI-powered receptionist for your business.</p>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="/features" className="text-gray-300 hover:text-white">Features</a></li>
                  <li><a href="/pricing" className="text-gray-300 hover:text-white">Pricing</a></li>
                  <li><a href="/test-agent-simple" className="text-gray-300 hover:text-white">Test AI</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Support</h4>
                <ul className="space-y-2">
                  <li><a href="/help" className="text-gray-300 hover:text-white">Help Center</a></li>
                  <li><a href="/contact" className="text-gray-300 hover:text-white">Contact</a></li>
                  <li><a href="/status" className="text-gray-300 hover:text-white">Status</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="/terms" className="text-gray-300 hover:text-white">Terms</a></li>
                  <li><a href="/privacy" className="text-gray-300 hover:text-white">Privacy</a></li>
                  <li><a href="/cookies" className="text-gray-300 hover:text-white">Cookies</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p className="text-gray-300">&copy; 2024 CloudGreet. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
