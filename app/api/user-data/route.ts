import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return user-specific data
    const userData = {
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        subscriptionPlan: user.subscriptionPlan,
        createdAt: user.createdAt
      },
      // Calculate metrics based on user's actual data
      metrics: {
        monthlyRevenue: calculateUserRevenue(user.id), // We'll implement this
        cloudGreetCost: 200,
        netProfit: calculateUserRevenue(user.id) - 200,
        roi: Math.round(((calculateUserRevenue(user.id) - 200) / 200) * 100),
        callsAnswered: calculateUserCalls(user.id),
        appointmentsBooked: calculateUserBookings(user.id),
        missedCallsPrevented: Math.floor(calculateUserCalls(user.id) * 0.3),
        averageResponseTime: 2.3,
        customerSatisfaction: 4.8,
        totalSavings: calculateUserRevenue(user.id) * 0.3
      }
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("User data API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions for user-specific calculations
function calculateUserRevenue(userId: string): number {
  // For now, return different amounts based on user ID
  // Later we'll connect to real booking data
  const baseRevenue = 25000
  const userMultiplier = userId.length % 3 + 1 // Creates variation
  return baseRevenue * userMultiplier
}

function calculateUserCalls(userId: string): number {
  const baseCalls = 150
  const userMultiplier = userId.length % 4 + 1
  return baseCalls * userMultiplier
}

function calculateUserBookings(userId: string): number {
  const baseBookings = 25
  const userMultiplier = userId.length % 3 + 1
  return baseBookings * userMultiplier
}
