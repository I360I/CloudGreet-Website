-- SQL Functions for Performance Optimization
-- These functions eliminate N+1 query patterns and optimize aggregations

-- Function to get call stats for multiple businesses
CREATE OR REPLACE FUNCTION get_business_call_stats(business_ids UUID[])
RETURNS TABLE (
  business_id UUID,
  call_count BIGINT,
  last_call_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.business_id,
    COUNT(*)::BIGINT as call_count,
    MAX(c.created_at) as last_call_date
  FROM calls c
  WHERE c.business_id = ANY(business_ids)
  GROUP BY c.business_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get appointment stats for multiple businesses
CREATE OR REPLACE FUNCTION get_business_appointment_stats(business_ids UUID[])
RETURNS TABLE (
  business_id UUID,
  appointment_count BIGINT,
  last_appointment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.business_id,
    COUNT(*)::BIGINT as appointment_count,
    MAX(a.scheduled_date) as last_appointment_date
  FROM appointments a
  WHERE a.business_id = ANY(business_ids)
  GROUP BY a.business_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate business revenue efficiently
CREATE OR REPLACE FUNCTION calculate_business_revenue(p_business_id UUID)
RETURNS TABLE (
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      SUM(
        CASE 
          WHEN actual_value IS NOT NULL AND actual_value > 0 THEN actual_value
          WHEN estimated_value IS NOT NULL AND estimated_value > 0 THEN estimated_value
          ELSE 0
        END
      ),
      0
    )::NUMERIC as total_revenue
  FROM appointments
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_business_call_stats IS 'Optimized function to get call statistics for multiple businesses in one query';
COMMENT ON FUNCTION get_business_appointment_stats IS 'Optimized function to get appointment statistics for multiple businesses in one query';
COMMENT ON FUNCTION calculate_business_revenue IS 'Optimized function to calculate total revenue for a business using SQL aggregation';



-- These functions eliminate N+1 query patterns and optimize aggregations

-- Function to get call stats for multiple businesses
CREATE OR REPLACE FUNCTION get_business_call_stats(business_ids UUID[])
RETURNS TABLE (
  business_id UUID,
  call_count BIGINT,
  last_call_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.business_id,
    COUNT(*)::BIGINT as call_count,
    MAX(c.created_at) as last_call_date
  FROM calls c
  WHERE c.business_id = ANY(business_ids)
  GROUP BY c.business_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get appointment stats for multiple businesses
CREATE OR REPLACE FUNCTION get_business_appointment_stats(business_ids UUID[])
RETURNS TABLE (
  business_id UUID,
  appointment_count BIGINT,
  last_appointment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.business_id,
    COUNT(*)::BIGINT as appointment_count,
    MAX(a.scheduled_date) as last_appointment_date
  FROM appointments a
  WHERE a.business_id = ANY(business_ids)
  GROUP BY a.business_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate business revenue efficiently
CREATE OR REPLACE FUNCTION calculate_business_revenue(p_business_id UUID)
RETURNS TABLE (
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      SUM(
        CASE 
          WHEN actual_value IS NOT NULL AND actual_value > 0 THEN actual_value
          WHEN estimated_value IS NOT NULL AND estimated_value > 0 THEN estimated_value
          ELSE 0
        END
      ),
      0
    )::NUMERIC as total_revenue
  FROM appointments
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_business_call_stats IS 'Optimized function to get call statistics for multiple businesses in one query';
COMMENT ON FUNCTION get_business_appointment_stats IS 'Optimized function to get appointment statistics for multiple businesses in one query';
COMMENT ON FUNCTION calculate_business_revenue IS 'Optimized function to calculate total revenue for a business using SQL aggregation';


