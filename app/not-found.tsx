"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, ArrowLeft, Search, HelpCircle, Phone, Brain
} from 'lucide-react'
import Link from 'next/link'

// Explicit export for Next.js not-found page
export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 404 Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-8xl md:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
              404
            </div>
            <div className="text-4xl md:text-6xl font-bold text-white mb-6">
              Page Not Found
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto"
          >
            The page you&apos;re looking for doesn&apos;t exist. It might have been moved, deleted, 
            or you entered the wrong URL.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            <Link
              href="/landing#how-it-works"
              className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300"
            >
              <HelpCircle className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">How it Works</h3>
              <p className="text-gray-300 text-sm">Learn how CloudGreet helps your business</p>
            </Link>

            <Link
              href="/contact"
              className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/30 transition-all duration-300"
            >
              <Phone className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Contact Support</h3>
              <p className="text-gray-300 text-sm">Get help from our support team</p>
            </Link>

            <Link
              href="/dashboard"
              className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
            >
              <Brain className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Dashboard</h3>
              <p className="text-gray-300 text-sm">Access your CloudGreet dashboard</p>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
