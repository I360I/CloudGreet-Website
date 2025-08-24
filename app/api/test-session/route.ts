import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

export async function GET() {
  try {
    const session = await getServerSession()
    
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user || null,
      timestamp: new Date().toISOString(),
      message: "Test API working"
    })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to get session",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
