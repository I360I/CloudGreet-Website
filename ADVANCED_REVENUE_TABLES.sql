-- Advanced Revenue Optimization Database Tables
-- These tables will store data for maximum revenue generation

-- Lead Scoring Table
CREATE TABLE IF NOT EXISTS lead_scoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    urgency VARCHAR(10) NOT NULL CHECK (urgency IN ('high', 'medium', 'low')),
    budget VARCHAR(10) NOT NULL CHECK (budget IN ('high', 'medium', 'low')),
    decision_maker BOOLEAN NOT NULL DEFAULT false,
    time_frame VARCHAR(15) NOT NULL CHECK (time_frame IN ('immediate', 'this_week', 'this_month', 'future')),
    previous_customer BOOLEAN NOT NULL DEFAULT false,
    referral_source VARCHAR(100),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    estimated_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upsell Opportunities Table
CREATE TABLE IF NOT EXISTS upsell_opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL,
    current_service VARCHAR(100) NOT NULL,
    suggested_upsells JSONB NOT NULL DEFAULT '[]',
    total_upsell_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversion_probability DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Optimization Log
CREATE TABLE IF NOT EXISTS pricing_optimization_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    optimized_price DECIMAL(10,2) NOT NULL,
    demand_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    customer_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    time_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    customer_profile JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor Analysis Table
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,
    analysis_data JSONB NOT NULL,
    market_position VARCHAR(50),
    price_recommendation DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Retention Analysis
CREATE TABLE IF NOT EXISTS retention_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    total_customers INTEGER NOT NULL DEFAULT 0,
    at_risk_customers INTEGER NOT NULL DEFAULT 0,
    high_value_customers INTEGER NOT NULL DEFAULT 0,
    retention_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    recommendations JSONB NOT NULL DEFAULT '[]',
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Forecasting Data
CREATE TABLE IF NOT EXISTS revenue_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    forecast_period_months INTEGER NOT NULL DEFAULT 3,
    historical_revenue JSONB NOT NULL DEFAULT '{}',
    forecast_data JSONB NOT NULL DEFAULT '[]',
    growth_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_predicted_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Conversation Analytics
CREATE TABLE IF NOT EXISTS ai_conversation_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    call_id VARCHAR(100) NOT NULL,
    conversation_transcript TEXT,
    lead_score INTEGER,
    upsell_opportunities JSONB DEFAULT '[]',
    pricing_optimization JSONB,
    conversion_outcome VARCHAR(50),
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    ai_performance_score INTEGER CHECK (ai_performance_score >= 0 AND ai_performance_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue Optimization Settings
CREATE TABLE IF NOT EXISTS revenue_optimization_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_scoring_enabled BOOLEAN NOT NULL DEFAULT true,
    upsell_enabled BOOLEAN NOT NULL DEFAULT true,
    dynamic_pricing_enabled BOOLEAN NOT NULL DEFAULT true,
    competitor_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
    retention_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
    revenue_forecasting_enabled BOOLEAN NOT NULL DEFAULT true,
    target_conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    target_average_deal_size DECIMAL(10,2) NOT NULL DEFAULT 500.0,
    upsell_target_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_scoring_business_id ON lead_scoring(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_score ON lead_scoring(score DESC);
CREATE INDEX IF NOT EXISTS idx_upsell_opportunities_business_id ON upsell_opportunities(business_id);
CREATE INDEX IF NOT EXISTS idx_upsell_opportunities_status ON upsell_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_pricing_optimization_business_id ON pricing_optimization_log(business_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_business_id ON competitor_analysis(business_id);
CREATE INDEX IF NOT EXISTS idx_retention_analysis_business_id ON retention_analysis(business_id);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_business_id ON revenue_forecasts(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_analytics_business_id ON ai_conversation_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_analytics_call_id ON ai_conversation_analytics(call_id);

-- Enable Row Level Security
ALTER TABLE lead_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_optimization_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_role access
CREATE POLICY "Service role has full access to lead_scoring" ON lead_scoring
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to upsell_opportunities" ON upsell_opportunities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to pricing_optimization_log" ON pricing_optimization_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to competitor_analysis" ON competitor_analysis
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to retention_analysis" ON retention_analysis
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to revenue_forecasts" ON revenue_forecasts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to ai_conversation_analytics" ON ai_conversation_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to revenue_optimization_settings" ON revenue_optimization_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON lead_scoring TO authenticated;
GRANT ALL PRIVILEGES ON upsell_opportunities TO authenticated;
GRANT ALL PRIVILEGES ON pricing_optimization_log TO authenticated;
GRANT ALL PRIVILEGES ON competitor_analysis TO authenticated;
GRANT ALL PRIVILEGES ON retention_analysis TO authenticated;
GRANT ALL PRIVILEGES ON revenue_forecasts TO authenticated;
GRANT ALL PRIVILEGES ON ai_conversation_analytics TO authenticated;
GRANT ALL PRIVILEGES ON revenue_optimization_settings TO authenticated;

-- Create functions for revenue optimization
CREATE OR REPLACE FUNCTION calculate_lead_score(
    p_urgency VARCHAR,
    p_budget VARCHAR,
    p_decision_maker BOOLEAN,
    p_time_frame VARCHAR,
    p_previous_customer BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Urgency scoring (30% of total)
    CASE p_urgency
        WHEN 'high' THEN score := score + 30;
        WHEN 'medium' THEN score := score + 20;
        WHEN 'low' THEN score := score + 10;
    END CASE;
    
    -- Budget scoring (25% of total)
    CASE p_budget
        WHEN 'high' THEN score := score + 25;
        WHEN 'medium' THEN score := score + 15;
        WHEN 'low' THEN score := score + 5;
    END CASE;
    
    -- Decision maker scoring (20% of total)
    IF p_decision_maker THEN
        score := score + 20;
    END IF;
    
    -- Timeframe scoring (15% of total)
    CASE p_time_frame
        WHEN 'immediate' THEN score := score + 15;
        WHEN 'this_week' THEN score := score + 12;
        WHEN 'this_month' THEN score := score + 8;
        WHEN 'future' THEN score := score + 5;
    END CASE;
    
    -- Previous customer bonus (10% of total)
    IF p_previous_customer THEN
        score := score + 10;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate estimated lead value
CREATE OR REPLACE FUNCTION calculate_lead_value(
    p_urgency VARCHAR,
    p_budget VARCHAR,
    p_previous_customer BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
    value DECIMAL := 0;
BEGIN
    -- Base value based on budget
    CASE p_budget
        WHEN 'high' THEN value := 2000;
        WHEN 'medium' THEN value := 1000;
        WHEN 'low' THEN value := 500;
    END CASE;
    
    -- Urgency multiplier
    CASE p_urgency
        WHEN 'high' THEN value := value + 500;
        WHEN 'medium' THEN value := value + 300;
        WHEN 'low' THEN value := value + 150;
    END CASE;
    
    -- Previous customer bonus
    IF p_previous_customer THEN
        value := value + 500;
    END IF;
    
    RETURN value;
END;
$$ LANGUAGE plpgsql;

-- Insert default revenue optimization settings for existing businesses
INSERT INTO revenue_optimization_settings (business_id, lead_scoring_enabled, upsell_enabled, dynamic_pricing_enabled)
SELECT id, true, true, true FROM businesses
ON CONFLICT (business_id) DO NOTHING;
