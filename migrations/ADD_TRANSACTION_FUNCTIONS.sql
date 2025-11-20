-- Database Transaction Functions
-- These functions wrap critical operations in transactions for data integrity

-- Function to create appointment with transaction
CREATE OR REPLACE FUNCTION create_appointment_safe(
  p_business_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_service_type TEXT,
  p_scheduled_date TEXT, -- ISO date string (YYYY-MM-DD)
  p_start_time TEXT DEFAULT NULL, -- ISO datetime string
  p_end_time TEXT DEFAULT NULL, -- ISO datetime string
  p_duration INTEGER DEFAULT 60,
  p_notes TEXT DEFAULT NULL,
  p_estimated_value NUMERIC DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_appointment_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  -- Calculate start/end times if not provided
  -- Convert string inputs to TIMESTAMPTZ
  IF p_start_time IS NOT NULL THEN
    v_start_time := p_start_time::TIMESTAMPTZ;
  ELSE
    v_start_time := (p_scheduled_date || ' 09:00:00')::TIMESTAMPTZ;
  END IF;
  
  IF p_end_time IS NOT NULL THEN
    v_end_time := p_end_time::TIMESTAMPTZ;
  ELSE
    v_end_time := v_start_time + (p_duration || ' minutes')::INTERVAL;
  END IF;
  
  -- Start transaction (implicit in function)
  INSERT INTO appointments (
    business_id,
    customer_name,
    customer_phone,
    customer_email,
    service_type,
    scheduled_date,
    start_time,
    end_time,
    duration,
    notes,
    estimated_value,
    address,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_business_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_service_type,
    p_scheduled_date,
    v_start_time,
    v_end_time,
    p_duration,
    p_notes,
    p_estimated_value,
    p_address,
    'scheduled',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_appointment_id;

  -- Log appointment creation
  INSERT INTO compliance_events (
    tenant_id,
    channel,
    event_type,
    path,
    metadata
  ) VALUES (
    p_business_id,
    'api',
    'appointment_created',
    '/api/appointments/create',
    jsonb_build_object(
      'appointment_id', v_appointment_id,
      'customer_phone', p_customer_phone,
      'scheduled_date', p_scheduled_date
    )
  );

  RETURN v_appointment_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction (automatic in function)
    RAISE EXCEPTION 'Failed to create appointment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to process payment with transaction
CREATE OR REPLACE FUNCTION process_payment_safe(
  p_business_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'usd',
  p_payment_type TEXT DEFAULT 'subscription',
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Start transaction
  INSERT INTO payments (
    business_id,
    amount,
    currency,
    payment_type,
    stripe_payment_intent_id,
    description,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_business_id,
    p_amount,
    p_currency,
    p_payment_type,
    p_stripe_payment_intent_id,
    p_description,
    'completed',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_id;

  -- Update business subscription status if subscription payment
  IF p_payment_type = 'subscription' THEN
    UPDATE businesses
    SET 
      subscription_status = 'active',
      updated_at = NOW()
    WHERE id = p_business_id;
  END IF;

  -- Log payment
  INSERT INTO compliance_events (
    tenant_id,
    channel,
    event_type,
    path,
    metadata
  ) VALUES (
    p_business_id,
    'api',
    'payment_processed',
    '/api/payments/process',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'amount', p_amount,
      'payment_type', p_payment_type
    )
  );

  RETURN v_payment_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction
    RAISE EXCEPTION 'Failed to process payment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to complete onboarding with transaction
CREATE OR REPLACE FUNCTION complete_onboarding_safe(
  p_business_id UUID,
  p_user_id UUID,
  p_business_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Start transaction
  -- Update business
  UPDATE businesses
  SET 
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_business_id;

  -- Create AI agent if not exists
  INSERT INTO ai_agents (
    business_id,
    agent_name,
    status,
    configuration,
    created_at,
    updated_at
  )
  SELECT 
    p_business_id,
    COALESCE(p_business_data->>'business_name', 'AI Agent'),
    'active',
    jsonb_build_object(
      'services', COALESCE(p_business_data->'services', '[]'::jsonb),
      'hours', COALESCE(p_business_data->'hours', '{}'::jsonb),
      'voice', COALESCE(p_business_data->'voice', '{}'::jsonb)
    ),
    NOW(),
    NOW()
  ON CONFLICT (business_id) DO UPDATE
  SET 
    updated_at = NOW(),
    configuration = EXCLUDED.configuration
  RETURNING id INTO v_agent_id;

  -- Log onboarding completion
  INSERT INTO compliance_events (
    tenant_id,
    channel,
    event_type,
    path,
    metadata
  ) VALUES (
    p_business_id,
    'onboarding',
    'onboarding_completed',
    '/api/onboarding/complete',
    jsonb_build_object(
      'user_id', p_user_id,
      'agent_id', v_agent_id
    )
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction
    RAISE EXCEPTION 'Failed to complete onboarding: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION create_appointment_safe IS 'Creates appointment with transaction and compliance logging';
COMMENT ON FUNCTION process_payment_safe IS 'Processes payment with transaction and updates subscription status';
COMMENT ON FUNCTION complete_onboarding_safe IS 'Completes onboarding with transaction, creates AI agent, and logs event';

