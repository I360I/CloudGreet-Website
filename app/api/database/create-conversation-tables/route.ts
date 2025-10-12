import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Only admins can create database tables
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    // Create conversation_history table
    const { error: convError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL,
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          customer_message TEXT NOT NULL,
          ai_response TEXT NOT NULL,
          sentiment VARCHAR(50),
          intent VARCHAR(50),
          urgency_level VARCHAR(20),
          lead_score INTEGER DEFAULT 0,
          extracted_info JSONB,
          emotional_state VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversation_history_business_id ON conversation_history(business_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_history_conversation_id ON conversation_history(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_conversation_history_sentiment ON conversation_history(sentiment);
        CREATE INDEX IF NOT EXISTS idx_conversation_history_intent ON conversation_history(intent);
        CREATE INDEX IF NOT EXISTS idx_conversation_history_lead_score ON conversation_history(lead_score);
      `
    })

    if (convError) {
      console.error('Error creating conversation_history table:', convError)
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    // Create customers table
    const { error: customersError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name VARCHAR(255),
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(255),
          address TEXT,
          customer_type VARCHAR(20) DEFAULT 'new',
          total_calls INTEGER DEFAULT 0,
          last_call_date TIMESTAMP WITH TIME ZONE,
          lead_score INTEGER DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(business_id, phone)
        );
        
        CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
        CREATE INDEX IF NOT EXISTS idx_customers_lead_score ON customers(lead_score);
      `
    })

    if (customersError) {
      console.error('Error creating customers table:', customersError)
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    // Create conversation_analytics table for insights
    const { error: analyticsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_analytics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          total_conversations INTEGER DEFAULT 0,
          avg_sentiment_score DECIMAL(3,2) DEFAULT 0,
          avg_lead_score DECIMAL(5,2) DEFAULT 0,
          intent_distribution JSONB,
          urgency_distribution JSONB,
          emotional_state_distribution JSONB,
          conversion_rate DECIMAL(5,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(business_id, date)
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversation_analytics_business_id ON conversation_analytics(business_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_analytics_date ON conversation_analytics(date);
      `
    })

    if (analyticsError) {
      console.error('Error creating conversation_analytics table:', analyticsError)
      return NextResponse.json({ error: analyticsError.message }, { status: 500 })
    }

    // Create triggers for updated_at
    const { error: triggerError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        DROP TRIGGER IF EXISTS update_conversation_history_updated_at ON conversation_history;
        CREATE TRIGGER update_conversation_history_updated_at
          BEFORE UPDATE ON conversation_history
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
        DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
        CREATE TRIGGER update_customers_updated_at
          BEFORE UPDATE ON customers
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          
        DROP TRIGGER IF EXISTS update_conversation_analytics_updated_at ON conversation_analytics;
        CREATE TRIGGER update_conversation_analytics_updated_at
          BEFORE UPDATE ON conversation_analytics
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    })

    if (triggerError) {
      console.error('Error creating triggers:', triggerError)
      return NextResponse.json({ error: triggerError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Advanced AI conversation tables created successfully',
      tables: [
        'conversation_history',
        'customers', 
        'conversation_analytics'
      ]
    })

  } catch (error) {
    console.error('Database creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create conversation tables'
    }, { status: 500 })
  }
}
