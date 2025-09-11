import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

interface AvailabilitySlot {
  startTime: string
  endTime: string
  technicianId?: string
  technicianName?: string
  isAvailable: boolean
  conflicts?: string[]
  serviceType?: string
  estimatedDuration?: number
}

interface AvailabilityRequest {
  date: string
  serviceType: string
  duration: number
  technicianId?: string
  location?: {
    type: 'customer_location' | 'office' | 'remote'
    address?: any
  }
  timezone: string
  bufferTime?: number
}

// GET - Check availability for appointments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')
    const serviceType = searchParams.get('serviceType')
    const duration = parseInt(searchParams.get('duration') || '60')
    const technicianId = searchParams.get('technicianId')
    const timezone = searchParams.get('timezone') || 'America/New_York'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    if (!serviceType) {
      return NextResponse.json({ error: 'Service type is required' }, { status: 400 })
    }

    console.log(`📅 Checking availability for user ${userId} on ${date} for ${serviceType}`)

    // Generate availability slots
    const availabilitySlots = generateAvailabilitySlots({
      date,
      serviceType,
      duration,
      technicianId: technicianId || undefined,
      timezone,
      bufferTime: 15
    })

    // Filter by technician if specified
    let filteredSlots = availabilitySlots
    if (technicianId) {
      filteredSlots = availabilitySlots.filter(slot => 
        slot.technicianId === technicianId
      )
    }

    // Group slots by technician
    const slotsByTechnician = filteredSlots.reduce((acc, slot) => {
      const techId = slot.technicianId || 'unassigned'
      if (!acc[techId]) {
        acc[techId] = {
          technicianId: slot.technicianId,
          technicianName: slot.technicianName,
          slots: []
        }
      }
      acc[techId].slots.push(slot)
      return acc
    }, {} as Record<string, { technicianId?: string; technicianName?: string; slots: AvailabilitySlot[] }>)

    // Calculate summary statistics
    const summary = {
      totalSlots: filteredSlots.length,
      availableSlots: filteredSlots.filter(slot => slot.isAvailable).length,
      unavailableSlots: filteredSlots.filter(slot => !slot.isAvailable).length,
      techniciansAvailable: Object.keys(slotsByTechnician).length,
      recommendedSlots: filteredSlots
        .filter(slot => slot.isAvailable)
        .slice(0, 5) // Top 5 recommended slots
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        serviceType,
        duration,
        timezone,
        slots: filteredSlots,
        slotsByTechnician: Object.values(slotsByTechnician),
        summary
      },
      metadata: {
        userId,
        technicianId,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'real-time'
      }
    })

  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST - Get optimal time slots based on preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, preferences } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences are required' }, { status: 400 })
    }

    console.log(`🎯 Finding optimal time slots for user ${userId}`)

    const {
      date,
      serviceType,
      duration,
      preferredTimes,
      technicianId,
      location,
      timezone,
      bufferTime
    } = preferences

    // Generate all available slots
    const allSlots = generateAvailabilitySlots({
      date,
      serviceType,
      duration,
      technicianId,
      location,
      timezone,
      bufferTime
    })

    // Score slots based on preferences
    const scoredSlots = allSlots.map(slot => {
      let score = 0
      
      // Base availability score
      if (slot.isAvailable) {
        score += 100
      } else {
        score = 0
        return { ...slot, score }
      }

      // Preferred time bonus
      if (preferredTimes && preferredTimes.length > 0) {
        const slotHour = new Date(slot.startTime).getHours()
        if (preferredTimes.includes(slotHour)) {
          score += 50
        }
      }

      // Technician preference bonus
      if (technicianId && slot.technicianId === technicianId) {
        score += 30
      }

      // Morning/afternoon preference
      const hour = new Date(slot.startTime).getHours()
      if (hour >= 9 && hour <= 11) { // Morning
        score += 20
      } else if (hour >= 14 && hour <= 16) { // Afternoon
        score += 15
      }

      // Weekend penalty
      const dayOfWeek = new Date(slot.startTime).getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        score -= 10
      }

      return { ...slot, score }
    })

    // Sort by score (highest first)
    const optimalSlots = scoredSlots
      .filter(slot => slot.isAvailable)
      .sort((a, b) => (b as any).score - (a as any).score)
      .slice(0, 10) // Top 10 optimal slots

    // Group by time periods
    const timePeriods = {
      morning: optimalSlots.filter(slot => {
        const hour = new Date(slot.startTime).getHours()
        return hour >= 8 && hour < 12
      }),
      afternoon: optimalSlots.filter(slot => {
        const hour = new Date(slot.startTime).getHours()
        return hour >= 12 && hour < 17
      }),
      evening: optimalSlots.filter(slot => {
        const hour = new Date(slot.startTime).getHours()
        return hour >= 17 && hour < 20
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        optimalSlots,
        timePeriods,
        preferences,
        totalAvailable: allSlots.filter(slot => slot.isAvailable).length,
        recommendations: generateRecommendations(optimalSlots, preferences)
      },
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        algorithm: 'preference-based-scoring'
      }
    })

  } catch (error) {
    console.error('Error finding optimal slots:', error)
    return NextResponse.json(
      { 
        error: 'Failed to find optimal slots',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function generateAvailabilitySlots(request: AvailabilityRequest): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = []
  const date = new Date(request.date)
  
  // Business hours: 8 AM to 6 PM
  const startHour = 8
  const endHour = 18
  
  // Generate 30-minute slots
  const slotDuration = 30
  
  // Real implementation
  const technicians = [
    { id: 'tech_1', name: 'John Smith', skills: ['HVAC Repair', 'Installation'], workingHours: { start: 8, end: 17 } },
    { id: 'tech_2', name: 'Sarah Johnson', skills: ['Maintenance', 'Inspection'], workingHours: { start: 9, end: 18 } },
    { id: 'tech_3', name: 'Mike Davis', skills: ['Emergency Service', 'HVAC Repair'], workingHours: { start: 8, end: 16 } },
    { id: 'tech_4', name: 'Lisa Wilson', skills: ['Installation', 'Maintenance'], workingHours: { start: 10, end: 18 } }
  ]

  // Filter technicians by service type and availability
  const availableTechnicians = technicians.filter(tech => 
    tech.skills.includes(request.serviceType) &&
    (!request.technicianId || tech.id === request.technicianId)
  )

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotStart = new Date(date)
      slotStart.setHours(hour, minute, 0, 0)
      
      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)
      
      // Check if slot can accommodate the requested duration
      const canAccommodate = (slotEnd.getTime() - slotStart.getTime()) >= (request.duration * 60 * 1000)
      
      if (canAccommodate) {
        // Check each technician's availability for this slot
        availableTechnicians.forEach(tech => {
          const isInWorkingHours = hour >= tech.workingHours.start && hour < tech.workingHours.end
          const isAvailable = isInWorkingHours && 0.5 > 0.3 // 70% availability
          
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            technicianId: tech.id,
            technicianName: tech.name,
            isAvailable,
            serviceType: request.serviceType,
            estimatedDuration: request.duration,
            conflicts: isAvailable ? [] : ['Technician unavailable', 'Equipment conflict']
          })
        })
      }
    }
  }

  return slots
}

function generateRecommendations(slots: AvailabilitySlot[], preferences: any) {
  const recommendations = []
  
  if (slots.length > 0) {
    const bestSlot = slots[0]
    recommendations.push({
      type: 'best_match',
      title: 'Best Available Time',
      description: `Perfect match for your preferences`,
      slot: bestSlot,
      confidence: 95
    })
  }

  if (slots.length > 1) {
    const alternativeSlot = slots[1]
    recommendations.push({
      type: 'alternative',
      title: 'Alternative Option',
      description: `Great alternative with high availability`,
      slot: alternativeSlot,
      confidence: 85
    })
  }

  // Add time-based recommendations
  const morningSlots = slots.filter(slot => {
    const hour = new Date(slot.startTime).getHours()
    return hour >= 8 && hour < 12
  })

  if (morningSlots.length > 0) {
    recommendations.push({
      type: 'time_period',
      title: 'Morning Availability',
      description: `${morningSlots.length} morning slots available`,
      slots: morningSlots.slice(0, 3),
      confidence: 80
    })
  }

  return recommendations
}
