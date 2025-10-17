import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Advanced dashboard query schema
const dashboardQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  userId: z.string().optional().default('default'),
  layoutId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = dashboardQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      userId: searchParams.get('userId'),
      layoutId: searchParams.get('layoutId')
    })

    const { businessId, userId, layoutId } = query

    // Generate comprehensive dashboard data
    const dashboardData = await generateDashboardData(businessId, userId, layoutId)

    return NextResponse.json({
      success: true,
      layouts: dashboardData.layouts,
      currentLayout: dashboardData.currentLayout,
      notifications: dashboardData.notifications,
      metadata: {
        businessId,
        userId,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Advanced dashboard API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }, { status: 500 })
  }
}

async function generateDashboardData(businessId: string, userId: string, layoutId?: string) {
  // Generate multiple dashboard layouts
  const layouts = [
    {
      id: 'default_layout',
      name: 'Default Dashboard',
      description: 'Standard dashboard with essential widgets',
      isDefault: true,
      widgets: [
        {
          id: 'widget_1',
          type: 'kpi',
          title: 'Key Performance Indicators',
          description: 'Overview of critical business metrics',
          size: 'large',
          position: { x: 0, y: 0 },
          isVisible: true,
          isPinned: true,
          isBookmarked: false,
          settings: { 
            timeframe: '30d', 
            metrics: ['revenue', 'calls', 'appointments', 'satisfaction'] 
          }
        },
        {
          id: 'widget_2',
          type: 'analytics',
          title: 'Advanced Analytics',
          description: 'Comprehensive analytics and metrics',
          size: 'full',
          position: { x: 0, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true }
        },
        {
          id: 'widget_3',
          type: 'calls',
          title: 'Real-Time Call Monitor',
          description: 'Live call monitoring and analytics',
          size: 'large',
          position: { x: 0, y: 2 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { autoRefresh: true, refreshInterval: 2000 }
        },
        {
          id: 'widget_4',
          type: 'insights',
          title: 'Automated Insights',
          description: 'AI-powered insights and recommendations',
          size: 'full',
          position: { x: 0, y: 3 },
          isVisible: true,
          isPinned: true,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true, viewMode: 'priority' }
        }
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    },
    {
      id: 'executive_layout',
      name: 'Executive Dashboard',
      description: 'High-level overview for executives and stakeholders',
      isDefault: false,
      widgets: [
        {
          id: 'widget_exec_1',
          type: 'kpi',
          title: 'Executive KPIs',
          description: 'Key performance indicators for leadership',
          size: 'full',
          position: { x: 0, y: 0 },
          isVisible: true,
          isPinned: true,
          isBookmarked: false,
          settings: { 
            timeframe: '90d', 
            metrics: ['revenue', 'growth', 'satisfaction', 'market-share'] 
          }
        },
        {
          id: 'widget_exec_2',
          type: 'benchmarking',
          title: 'Industry Benchmarking',
          description: 'Performance comparison against industry standards',
          size: 'large',
          position: { x: 0, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '90d', benchmarkType: 'industry' }
        },
        {
          id: 'widget_exec_3',
          type: 'charts',
          title: 'Strategic Analytics',
          description: 'Long-term trends and strategic insights',
          size: 'large',
          position: { x: 1, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '1y', autoRefresh: false }
        }
      ],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date()
    },
    {
      id: 'operations_layout',
      name: 'Operations Dashboard',
      description: 'Detailed operational metrics and monitoring',
      isDefault: false,
      widgets: [
        {
          id: 'widget_ops_1',
          type: 'calls',
          title: 'Call Operations Monitor',
          description: 'Real-time call monitoring and management',
          size: 'full',
          position: { x: 0, y: 0 },
          isVisible: true,
          isPinned: true,
          isBookmarked: false,
          settings: { autoRefresh: true, refreshInterval: 1000 }
        },
        {
          id: 'widget_ops_2',
          type: 'conversion',
          title: 'Lead Conversion Operations',
          description: 'Detailed lead conversion tracking and optimization',
          size: 'large',
          position: { x: 0, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', viewMode: 'detailed' }
        },
        {
          id: 'widget_ops_3',
          type: 'analytics',
          title: 'Operational Analytics',
          description: 'Detailed operational metrics and KPIs',
          size: 'medium',
          position: { x: 1, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true }
        },
        {
          id: 'widget_ops_4',
          type: 'charts',
          title: 'Performance Charts',
          description: 'Operational performance visualization',
          size: 'medium',
          position: { x: 1, y: 2 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true }
        }
      ],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date()
    },
    {
      id: 'marketing_layout',
      name: 'Marketing Dashboard',
      description: 'Marketing performance and campaign analytics',
      isDefault: false,
      widgets: [
        {
          id: 'widget_mkt_1',
          type: 'conversion',
          title: 'Marketing Conversion Funnel',
          description: 'Track leads through marketing conversion funnel',
          size: 'full',
          position: { x: 0, y: 0 },
          isVisible: true,
          isPinned: true,
          isBookmarked: false,
          settings: { timeframe: '30d', viewMode: 'sources' }
        },
        {
          id: 'widget_mkt_2',
          type: 'charts',
          title: 'Campaign Performance',
          description: 'Marketing campaign analytics and ROI',
          size: 'large',
          position: { x: 0, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true }
        },
        {
          id: 'widget_mkt_3',
          type: 'analytics',
          title: 'Marketing Analytics',
          description: 'Comprehensive marketing metrics and insights',
          size: 'large',
          position: { x: 1, y: 1 },
          isVisible: true,
          isPinned: false,
          isBookmarked: false,
          settings: { timeframe: '30d', autoRefresh: true }
        }
      ],
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date()
    }
  ]

  // Determine current layout
  let currentLayout = layouts[0] // Default to first layout
  
  if (layoutId) {
    const foundLayout = layouts.find(layout => layout.id === layoutId)
    if (foundLayout) {
      currentLayout = foundLayout
    }
  }

  // Generate notifications
  const notifications = {
    unreadInsights: Math.floor(Math.random() * 8) + 2, // 2-10 unread insights
    alerts: Math.floor(Math.random() * 3), // 0-3 alerts
    updates: Math.floor(Math.random() * 5) // 0-5 updates
  }

  return {
    layouts,
    currentLayout,
    notifications
  }
}
