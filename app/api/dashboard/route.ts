import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Session found:", session.user.email)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log("User not found in database")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("User found:", user.email)

    // Return user-specific data
    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        subscriptionPlan: user.subscriptionPlan
      },
      metrics: {
        monthlyRevenue: 47850,
        cloudGreetCost: 200,
        netProfit: 47650,
        roi: 23825,
        callsAnswered: 342,
        appointmentsBooked: 89,
        missedCallsPrevented: 127,
        averageResponseTime: 2.3,
        customerSatisfaction: 4.8,
        totalSavings: 14355
      },
      recentBookings: [
        { id: "1", customer: "Mike Johnson", service: "Kitchen Remodel", value: 8500, time: "2 hours ago", status: "confirmed" },
        { id: "2", customer: "Sarah Chen", service: "Bathroom Renovation", value: 4200, time: "4 hours ago", status: "confirmed" },
        { id: "3", customer: "David Wilson", service: "Deck Installation", value: 6800, time: "6 hours ago", status: "pending" },
        { id: "4", customer: "Lisa Rodriguez", service: "Flooring Replacement", value: 3400, time: "8 hours ago", status: "confirmed" }
      ],
      goals: [
        { id: "1", title: "Monthly Revenue Target", description: "Reach $50K monthly revenue", icon: "💰", current: 47850, target: 50000, unit: "$", goalType: "revenue" },
        { id: "2", title: "New Customer Acquisition", description: "Gain 15 new customers this month", icon: "👥", current: 12, target: 15, unit: " customers", goalType: "growth" },
        { id: "3", title: "Project Completion", description: "Complete 25 projects this month", icon: "✅", current: 21, target: 25, unit: " projects", goalType: "efficiency" }
      ]
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
