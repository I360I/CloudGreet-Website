'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  data: any
  filename: string
  businessName: string
}

export default function ExportButton({ data, filename, businessName }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = () => {
    setIsExporting(true)

    try {
      // Prepare CSV data
      const headers = ['Type', 'Description', 'Date', 'Value', 'Status']
      const rows = [
        headers,
        ['Business Name', businessName, new Date().toLocaleDateString(), '', ''],
        ['Report Generated', '', new Date().toLocaleString(), '', ''],
        [], // Empty row
        ['Summary', '', '', '', ''],
        ['Total Calls', '', '', data.totalCalls || 0, ''],
        ['Total Appointments', '', '', data.totalAppointments || 0, ''],
        ['Total Revenue', '', '', `$${data.totalRevenue || 0}`, ''],
        [], // Empty row
        ['Recent Activity', '', '', '', '']
      ]

      // Add recent calls if available
      if (data.recentCalls && data.recentCalls.length > 0) {
        rows.push([])
        rows.push(['Recent Calls', '', '', '', ''])
        rows.push(['Caller', 'Duration', 'Date', 'Time', 'Status'])
        data.recentCalls.forEach((call: any) => {
          rows.push([
            call.caller || 'Unknown',
            call.duration || '-',
            call.date || '-',
            call.time || '-',
            call.status || '-'
          ])
        })
      }

      // Add upcoming appointments if available
      if (data.upcomingAppointments && data.upcomingAppointments.length > 0) {
        rows.push([])
        rows.push(['Upcoming Appointments', '', '', '', ''])
        rows.push(['Customer', 'Service', 'Date', 'Time', 'Value'])
        data.upcomingAppointments.forEach((apt: any) => {
          rows.push([
            apt.customer || 'Unknown',
            apt.service || '-',
            apt.date || '-',
            apt.time || '-',
            apt.value || '-'
          ])
        })
      }

      // Convert to CSV string
      const csvContent = rows
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async () => {
    setIsExporting(true)

    try {
      // For now, create a printable HTML report
      // In a real implementation, you'd use jsPDF or similar
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to export PDF')
        return
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${businessName} - Dashboard Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 10px;
            }
            h2 {
              color: #1e40af;
              margin-top: 30px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin: 30px 0;
            }
            .metric {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
            }
            .metric-label {
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            .metric-value {
              font-size: 28px;
              font-weight: bold;
              color: #1e40af;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              background: #f3f4f6;
              font-weight: 600;
              color: #1e40af;
            }
            tr:hover {
              background: #f9fafb;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${businessName} - Dashboard Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          
          <div class="summary">
            <div class="metric">
              <div class="metric-label">Total Calls</div>
              <div class="metric-value">${data.totalCalls || 0}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Appointments</div>
              <div class="metric-value">${data.totalAppointments || 0}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Revenue</div>
              <div class="metric-value">$${data.totalRevenue || 0}</div>
            </div>
          </div>

          ${data.recentCalls && data.recentCalls.length > 0 ? `
            <h2>Recent Calls</h2>
            <table>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.recentCalls.map((call: any) => `
                  <tr>
                    <td>${call.caller || 'Unknown'}</td>
                    <td>${call.duration || '-'}</td>
                    <td>${call.date || '-'}</td>
                    <td>${call.status || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${data.upcomingAppointments && data.upcomingAppointments.length > 0 ? `
            <h2>Upcoming Appointments</h2>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${data.upcomingAppointments.map((apt: any) => `
                  <tr>
                    <td>${apt.customer || 'Unknown'}</td>
                    <td>${apt.service || '-'}</td>
                    <td>${apt.date || '-'}</td>
                    <td>${apt.time || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="footer">
            <p><strong>CloudGreet</strong> - AI Receptionist Platform</p>
            <p>This report was generated from your dashboard data.</p>
          </div>

          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
              Print / Save as PDF
            </button>
            <button onclick="window.close()" style="background: #6b7280; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
      
      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg"
        data-export-button
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="text-sm">Export</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && !isExporting && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <motion.button
                onClick={exportToCSV}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white transition-colors border-b border-white/5 flex items-center gap-3"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                Export as CSV
              </motion.button>

              <motion.button
                onClick={exportToPDF}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-3"
              >
                <FileText className="w-4 h-4 text-red-400" />
                Export as PDF
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

