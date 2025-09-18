"use client"

import React from 'react'
import { motion } from 'framer-motion'

export default function SilkRibbon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="relative">
        {/* Ribbon */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-8 py-2 rounded-full shadow-2xl">
          <div className="flex items-center gap-2 text-white">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-lg"
            >
              🎉
            </motion.div>
            <span className="font-bold text-sm tracking-wide">
              LIMITED TIME: 7-Day Free Trial
            </span>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 1 }}
              className="text-lg"
            >
              🎉
            </motion.div>
          </div>
        </div>
        
        {/* Ribbon tails */}
        <div className="absolute -bottom-1 left-0 w-0 h-0 border-l-[15px] border-l-transparent border-t-[15px] border-t-blue-600"></div>
        <div className="absolute -bottom-1 right-0 w-0 h-0 border-r-[15px] border-r-transparent border-t-[15px] border-t-blue-600"></div>
        
        {/* Shine effect */}
        <motion.div
          animate={{ x: [-100, 400] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
        ></motion.div>
      </div>
    </motion.div>
  )
}
