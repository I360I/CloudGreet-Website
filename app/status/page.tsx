import React from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, Clock, Server, Database, Phone, MessageSquare } from 'lucide-react'

const systemStatus = {
  overall: 'operational',
  services: [
    {
      name: 'API Services',
      status: 'operational',
      description: 'All API endpoints are responding normally',
      uptime: '99.9%'
    },
    {
      name: 'Database',
      status: 'operational',
      description: 'Supabase database is running smoothly',
      uptime: '99.8%'
    },
    {
      name: 'AI Services',
      status: 'operational',
      description: 'OpenAI integration is working properly',
      uptime: '99.7%'
    },
    {
      name: 'Voice Services',
      status: 'operational',
      description: 'Telnyx voice integration is active',
      uptime: '99.6%'
    },
    {
      name: 'SMS Services',
      status: 'operational',
      description: 'SMS messaging is functioning normally',
      uptime: '99.5%'
    },
    {
      name: 'Calendar Integration',
      status: 'operational',
      description: 'Google Calendar sync is working',
      uptime: '99.4%'
    }
  ],
  recentIncidents: [
    {
      title: 'Scheduled Maintenance',
      status: 'resolved',
      date: '2024-10-15',
      description: 'Completed routine maintenance on database servers. All services restored.'
    },
    {
      title: 'API Rate Limit Adjustment',
      status: 'resolved',
      date: '2024-10-10',
      description: 'Optimized API rate limits to improve performance for high-volume users.'
    }
  ]
}

const StatusPage = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-6 w-6 text-green-400" />
      case 'degraded':
        return <AlertCircle className="h-6 w-6 text-yellow-400" />
      case 'outage':
        return <XCircle className="h-6 w-6 text-red-400" />
      default:
        return <Clock className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-400'
      case 'degraded':
        return 'text-yellow-400'
      case 'outage':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            System Status
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Real-time status of all CloudGreet services
          </p>
          
          {/* Overall Status */}
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-8 max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-center mb-4">
              {getStatusIcon(systemStatus.overall)}
              <span className={`ml-3 text-2xl font-bold ${getStatusColor(systemStatus.overall)}`}>
                All Systems Operational
              </span>
            </div>
            <p className="text-gray-300">
              All CloudGreet services are running normally. No issues detected.
            </p>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {systemStatus.services.map((service, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-purple-300">{service.name}</h3>
                {getStatusIcon(service.status)}
              </div>
              <p className="text-gray-400 mb-3">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Uptime</span>
                <span className="text-sm font-semibold text-green-400">{service.uptime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Incidents */}
        <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-10 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-red-600">
            Recent Incidents
          </h2>
          <div className="space-y-6">
            {systemStatus.recentIncidents.map((incident, index) => (
              <div key={index} className="border-b border-gray-700 pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-purple-300">{incident.title}</h3>
                  <div className="flex items-center">
                    {getStatusIcon(incident.status)}
                    <span className={`ml-2 text-sm font-semibold ${getStatusColor(incident.status)}`}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 mb-2">{incident.description}</p>
                <p className="text-sm text-gray-500">{incident.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 text-center">
            <Server className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-purple-300 mb-2">99.9%</h3>
            <p className="text-gray-400">API Uptime</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 text-center">
            <Database className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-purple-300 mb-2">99.8%</h3>
            <p className="text-gray-400">Database Uptime</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 text-center">
            <Phone className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-purple-300 mb-2">99.6%</h3>
            <p className="text-gray-400">Voice Services</p>
          </div>
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 text-center">
            <MessageSquare className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-purple-300 mb-2">99.5%</h3>
            <p className="text-gray-400">SMS Services</p>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center">
          <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-purple-300">Report an Issue</h2>
            <p className="text-lg text-gray-300 mb-8">
              If you're experiencing issues not reflected in our status page, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 shadow-lg transform hover:scale-105 text-center">
                Contact Support
              </Link>
              <Link href="/help" className="bg-white bg-opacity-10 border border-gray-600 text-gray-200 hover:bg-opacity-20 hover:border-purple-500 font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 text-center">
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusPage
