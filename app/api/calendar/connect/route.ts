import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes - in production this would be a database
let calendarConnections = new Map()

export async function POST(request: NextRequest) {
  try {
    const { businessName, calendarType, email, timezone } = await request.json()
    
    if (!businessName || !calendarType) {
      return NextResponse.json(
        { success: false, error: 'Business name and calendar type are required' },
        { status: 400 }
      )
    }

    // Simulate calendar connection
    const connectionId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store the connection
    calendarConnections.set(businessName, {
      connectionId,
      businessName,
      calendarType,
      email,
      timezone: timezone || 'America/New_York',
      connectedAt: new Date().toISOString(),
      status: 'connected',
      syncSettings: {
        twoWaySync: true,
        autoAccept: true,
        bufferTime: 15, // minutes
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '16:00', enabled: false },
          sunday: { start: '10:00', end: '16:00', enabled: false }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        connectionId,
        businessName,
        calendarType,
        email,
        timezone: timezone || 'America/New_York',
        connectedAt: new Date().toISOString(),
        status: 'connected',
        message: `Successfully connected to ${calendarType} for ${businessName}`
      }
    })

  } catch (error) {
    console.error('Calendar connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to connect calendar' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const connection = calendarConnections.get(businessName)
    
    if (!connection) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_connected',
          message: 'No calendar connected yet'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: connection
    })

  } catch (error) {
    console.error('Calendar lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup calendar connection' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { businessName, syncSettings } = await request.json()
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const connection = calendarConnections.get(businessName)
    
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Calendar connection not found' },
        { status: 404 }
      )
    }

    // Update sync settings
    connection.syncSettings = {
      ...connection.syncSettings,
      ...syncSettings
    }
    connection.updatedAt = new Date().toISOString()

    calendarConnections.set(businessName, connection)

    return NextResponse.json({
      success: true,
      data: connection,
      message: 'Calendar sync settings updated successfully'
    })

  } catch (error) {
    console.error('Calendar update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update calendar settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    const connection = calendarConnections.get(businessName)
    
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Calendar connection not found' },
        { status: 404 }
      )
    }

    // Mark as disconnected
    connection.status = 'disconnected'
    connection.disconnectedAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      data: connection,
      message: 'Calendar connection disconnected successfully'
    })

  } catch (error) {
    console.error('Calendar disconnect error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect calendar' },
      { status: 500 }
    )
  }
}

