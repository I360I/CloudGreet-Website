'use client'

import { useEffect, useState, memo } from 'react'
import Link from 'next/link'

const Footer = memo(function Footer() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent flash
  if (!mounted) {
    return null
  }

  return (
    <footer className="bg-black/40 backdrop-blur-xl border-t border-gray-800/50 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">CloudGreet</h3>
            <p className="text-gray-300">AI-powered receptionist for your business.</p>
          </div>
          <div>
            <h4 className="text-base font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-gray-300 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/test-agent-simple" className="text-gray-300 hover:text-white transition-colors">Test AI</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-gray-300 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/status" className="text-gray-300 hover:text-white transition-colors">Status</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-gray-300 hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/cookies" className="text-gray-300 hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-300">&copy; 2024 CloudGreet. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/login" 
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors border border-purple-500/30 px-4 py-3 min-h-[44px] rounded-lg hover:border-purple-500 hover:bg-purple-500/10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Admin login"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer

