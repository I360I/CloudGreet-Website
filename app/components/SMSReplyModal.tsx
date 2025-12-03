'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageSquare, Phone, User } from 'lucide-react'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { Modal } from './ui/Modal'

interface SMSReplyModalProps {
  isOpen: boolean,
  onClose: () => void,
  contact: {
  name: string,
  phone: string
    email?: string
  },
  businessId: string
}

export default function SMSReplyModal({ isOpen, onClose, contact, businessId }: SMSReplyModalProps) {
  const { theme } = useBusinessData()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true)
    try {
      const response = await fetchWithAuth('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: contact.phone,
          message: message.trim(),
          businessId,
          type: 'manual_sms'
        })
      })

      if (response.ok) {
        setSent(true)
        setTimeout(() => {
          setSent(false)
          setMessage('')
          onClose()
        }, 2000)
      }
    } catch (error) {
      logger.error('Failed to send SMS:', { contact: contact.phone, message, error: error instanceof Error ? error.message : 'Unknown' })
    } finally {
      setSending(false)
    }
  }

  const quickReplies = [
    "Thanks for calling! How can we help you today?",
    "Your estimate is ready. When would you like to schedule?",
    "We're here to help! What do you need?",
    "Thanks for your interest! Let's get started."
  ]

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Send SMS"
      size="md"
      aria-labelledby="sms-reply-modal-title"
      aria-describedby="sms-reply-modal-description"
    >
      <div id="sms-reply-modal-description" className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
            <User className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 id="sms-reply-modal-title" className="font-semibold text-white">{contact.name}</h3>
            <p className="text-sm text-slate-400">{contact.phone}</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Message Sent!</h3>
            <p className="text-slate-400">Your SMS has been delivered.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 resize-none"
                style={{ focusRingColor: primaryColor }}
                rows={4}
                maxLength={160}
                aria-label="SMS message text"
                aria-describedby="sms-char-count"
              />
              <div className="flex justify-between items-center mt-1">
                <span id="sms-char-count" className="text-xs text-slate-500">
                  {message.length}/160 characters
                </span>
                <span className="text-xs text-slate-500">
                  SMS rates apply
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quick Replies
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(reply)}
                    className="p-2 text-xs text-left bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-colors text-slate-300"
                    aria-label={`Use quick reply: ${reply}`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-slate-700/50">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-800/50 transition-colors"
                aria-label="Cancel sending SMS"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                style={{ backgroundColor: primaryColor }}
                aria-label="Send SMS message"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send SMS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
