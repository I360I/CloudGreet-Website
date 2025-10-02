import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthStatus: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    // Test database connection
    try {
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (error) {
        healthStatus.status = 'degraded';
        healthStatus.database = 'error';
      } else {
        healthStatus.database = 'connected';
      }
    } catch (dbError) {
      healthStatus.status = 'degraded';
      healthStatus.database = 'error';
    }

    // Test external services
    const services = {
      resend: !!process.env.RESEND_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      telnyx: !!process.env.TELYNX_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    healthStatus.services = services;

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log client-side errors
    if (body.error) {
      console.error('Client error:', body.error);
      
      // Store error in database for monitoring
      try {
        await supabaseAdmin.from('audit_logs').insert({
          action: 'client_error',
          details: {
            error: body.error,
            url: body.url,
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          },
        });
      } catch (dbError) {
        console.error('Failed to log client error to database:', dbError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling client error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process error log' },
      { status: 500 }
    );
  }
}