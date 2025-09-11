import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes - in production this would be a database
let phoneAssignments = new Map()

export async function POST(request: NextRequest) {
  try {
    const { businessName, businessType, location } = await request.json()
    
    if (!businessName) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      )
    }

    // Generate a unique phone number for the business
    const areaCode = getAreaCodeForLocation(location)
    const phoneNumber = generatePhoneNumber(areaCode)
    
    // Store the assignment
    phoneAssignments.set(businessName, {
      phoneNumber,
      businessName,
      businessType,
      location,
      assignedAt: new Date().toISOString(),
      status: 'active',
      callForwarding: {
        enabled: true,
        destination: 'ai_receptionist'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        phoneNumber,
        businessName,
        businessType,
        location,
        assignedAt: new Date().toISOString(),
        status: 'active',
        message: `Phone number ${phoneNumber} has been assigned to ${businessName}`
      }
    })

  } catch (error) {
    console.error('Phone assignment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign phone number' },
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

    const assignment = phoneAssignments.get(businessName)
    
    if (!assignment) {
      return NextResponse.json({
        success: true,
        data: {
          phoneNumber: null,
          status: 'not_assigned',
          message: 'No phone number assigned yet'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: assignment
    })

  } catch (error) {
    console.error('Phone lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup phone number' },
      { status: 500 }
    )
  }
}

function getAreaCodeForLocation(location: string): string {
  // Simple area code mapping based on location
  const areaCodeMap: { [key: string]: string } = {
    'texas': '512',
    'california': '415',
    'florida': '305',
    'new york': '212',
    'chicago': '312',
    'austin': '512',
    'houston': '713',
    'dallas': '214',
    'san antonio': '210',
    'los angeles': '213',
    'san francisco': '415',
    'miami': '305',
    'orlando': '407',
    'tampa': '813',
    'atlanta': '404',
    'phoenix': '602',
    'denver': '303',
    'seattle': '206',
    'portland': '503',
    'boston': '617',
    'philadelphia': '215',
    'detroit': '313',
    'minneapolis': '612',
    'kansas city': '816',
    'nashville': '615',
    'memphis': '901',
    'new orleans': '504',
    'birmingham': '205',
    'mobile': '251',
    'jacksonville': '904',
    'tallahassee': '850',
    'gainesville': '352',
    'tampa': '813',
    'st petersburg': '727',
    'clearwater': '727',
    'lakeland': '863',
    'sarasota': '941',
    'fort myers': '239',
    'naples': '239',
    'pensacola': '850',
    'panama city': '850',
    'destin': '850',
    'palm beach': '561',
    'boca raton': '561',
    'delray beach': '561',
    'boynton beach': '561',
    'west palm beach': '561',
    'fort lauderdale': '954',
    'hollywood': '954',
    'pembroke pines': '954',
    'coral springs': '954',
    'sunrise': '954',
    'plantation': '954',
    'tamarac': '954',
    'lauderdale lakes': '954',
    'lauderhill': '954',
    'margate': '954',
    'coconut creek': '954',
    'pompano beach': '954',
    'deerfield beach': '954',
    'lighthouse point': '954',
    'hillsboro beach': '954',
    'sea ranch lakes': '954',
    'wilton manors': '954',
    'oakland park': '954',
    'lauderdale by the sea': '954',
    'davie': '954',
    'cooper city': '954',
    'weston': '954',
    'sunrise': '954',
    'plantation': '954',
    'tamarac': '954',
    'lauderdale lakes': '954',
    'lauderhill': '954',
    'margate': '954',
    'coconut creek': '954',
    'pompano beach': '954',
    'deerfield beach': '954',
    'lighthouse point': '954',
    'hillsboro beach': '954',
    'sea ranch lakes': '954',
    'wilton manors': '954',
    'oakland park': '954',
    'lauderdale by the sea': '954',
    'davie': '954',
    'cooper city': '954',
    'weston': '954'
  }
  
  const locationLower = location?.toLowerCase() || ''
  
  // Try to find exact match first
  if (areaCodeMap[locationLower]) {
    return areaCodeMap[locationLower]
  }
  
  // Try to find partial match
  for (const [key, code] of Object.entries(areaCodeMap)) {
    if (locationLower.includes(key) || key.includes(locationLower)) {
      return code
    }
  }
  
  // Default to a common area code
  return '555'
}

function generatePhoneNumber(areaCode: string): string {
  // Generate a random phone number with the given area code
  const exchange = Math.floor(Math.random() * 900) + 100 // 100-999
  const number = Math.floor(Math.random() * 9000) + 1000 // 1000-9999
  
  return `(${areaCode}) ${exchange}-${number}`
}

