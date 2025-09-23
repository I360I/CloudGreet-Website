"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, CreditCard, DollarSign, Calendar, 
  Download, Eye, AlertCircle, CheckCircle,
  TrendingUp, Users, Phone, FileText
} from 'lucide-react'
import Link from 'next/link'

export default function BillingPage() {
  const [billingData, setBillingData] = useState({
    currentPlan: 'CloudGreet Pro',
    monthlyFee: 200,
    perBookingFee: 50,
    nextBillingDate: '2024-02-15',
    status: 'active',
    usage: {
      bookingsThisMonth: 12,
      totalBookings: 156,
      monthlyRecurring: 200,
      totalSpent: 800
    }
  })

  const [invoices, setInvoices] = useState([
    {
      id: 'INV-2024-001',
      date: '2024-01-15',
      amount: 800,
      status: 'paid',
      description: 'Monthly subscription + 12 bookings'
    },
    {
      id: 'INV-2024-002',
      date: '2023-12-15',
      amount: 750,
      status: 'paid',
      description: 'Monthly subscription + 11 bookings'
    },
    {
      id: 'INV-2024-003',
      date: '2023-11-15',
      amount: 700,
      status: 'paid',
      description: 'Monthly subscription + 10 bookings'
    }
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-xl bg-black/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">Billing & Subscription</h1>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Manage Payment
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Current Plan Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{billingData.currentPlan}</h2>
              <p className="text-gray-300">Your current subscription plan</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Active</span>
              </div>
              <p className="text-gray-300 text-sm">Next billing: {billingData.nextBillingDate}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Monthly Fee</h3>
              </div>
              <p className="text-3xl font-bold text-white">${billingData.monthlyFee}</p>
              <p className="text-gray-400 text-sm">Base subscription</p>
            </div>
            
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Per Booking</h3>
              </div>
              <p className="text-3xl font-bold text-white">${billingData.perBookingFee}</p>
              <p className="text-gray-400 text-sm">Only when you book</p>
            </div>
            
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">This Month</h3>
              </div>
              <p className="text-3xl font-bold text-white">${billingData.usage.totalSpent}</p>
              <p className="text-gray-400 text-sm">{billingData.usage.bookingsThisMonth} bookings</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Usage Statistics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Usage Statistics</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Total Bookings</span>
                </div>
                <span className="text-2xl font-bold text-white">{billingData.usage.totalBookings}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">This Month</span>
                </div>
                <span className="text-2xl font-bold text-white">{billingData.usage.bookingsThisMonth}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Total Spent</span>
                </div>
                <span className="text-2xl font-bold text-white">${billingData.usage.totalSpent}</span>
              </div>
            </div>
          </motion.div>

          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Payment Method</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-700/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                    <span className="text-white font-medium">Visa ending in 4242</span>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Default</span>
                </div>
                <p className="text-gray-300 text-sm mb-4">Expires 12/25</p>
                <div className="flex gap-3">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                  <button className="text-red-400 hover:text-red-300 text-sm font-medium">Remove</button>
                </div>
              </div>
              
              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                Add Payment Method
              </button>
            </div>
          </motion.div>
        </div>

        {/* Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8 mt-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Recent Invoices</h3>
            <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">View All</button>
          </div>
          
          <div className="space-y-4">
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invoice.id}</p>
                    <p className="text-gray-300 text-sm">{invoice.description}</p>
                    <p className="text-gray-400 text-xs">{invoice.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-semibold">${invoice.amount}</p>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">Paid</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Billing Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8 mt-8"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Billing Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Billing Address</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your billing address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tax ID (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your tax ID"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
              Update Billing Information
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}