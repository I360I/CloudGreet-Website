import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Dashboard Debug - Starting...')
    
    // Check session
    const session = await getServerSession(authOptions)
    console.log('🔍 Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })
    
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        debug: {
          hasSession: !!session,
          hasUser: !!session?.user
        }
      }, { status: 401 })
    }

    const userId = (session.user as any).id || session.user.email
    console.log('🔍 User ID:', userId)

    // Check database connection
    console.log('🔍 Testing database connection...')
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single()

    console.log('🔍 Database test result:', { 
      hasData: !!dbTest, 
      error: dbError?.message,
      userData: dbTest 
    })

    // Check analytics table
    console.log('🔍 Testing analytics table...')
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .limit(5)

    console.log('🔍 Analytics test result:', { 
      hasData: !!analyticsData, 
      error: analyticsError?.message,
      count: analyticsData?.length 
    })

    // Check call_logs table
    console.log('🔍 Testing call_logs table...')
    const { data: callLogsData, error: callLogsError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', userId)
      .limit(5)

    console.log('🔍 Call logs test result:', { 
      hasData: !!callLogsData, 
      error: callLogsError?.message,
      count: callLogsData?.length 
    })

    // Check voice_agents table
    console.log('🔍 Testing voice_agents table...')
    const { data: agentsData, error: agentsError } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('user_id', userId)

    console.log('🔍 Voice agents test result:', { 
      hasData: !!agentsData, 
      error: agentsError?.message,
      count: agentsData?.length 
    })

    return NextResponse.json({
      success: true,
      debug: {
        session: {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: userId,
          userEmail: session?.user?.email
        },
        database: {
          userQuery: {
            success: !dbError,
            error: dbError?.message,
            data: dbTest
          },
          analyticsQuery: {
            success: !analyticsError,
            error: analyticsError?.message,
            count: analyticsData?.length || 0
          },
          callLogsQuery: {
            success: !callLogsError,
            error: callLogsError?.message,
            count: callLogsData?.length || 0
          },
          voiceAgentsQuery: {
            success: !agentsError,
            error: agentsError?.message,
            count: agentsData?.length || 0
          }
        }
      }
    })

  } catch (error) {
    console.error('🔍 Dashboard debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}
