-- ===========================================
-- NORMALIZE EXISTING PHONE NUMBERS
-- One-time migration to normalize all phone numbers to E.164 format
-- ===========================================

-- This migration normalizes phone numbers in:
-- 1. businesses.phone_number and businesses.phone
-- 2. toll_free_numbers.number
-- 3. ai_agents.phone_number

-- Note: This uses PostgreSQL functions to normalize phone numbers
-- The actual normalization logic matches the TypeScript normalizePhoneForStorage function

-- Function to normalize phone number to E.164 format
CREATE OR REPLACE FUNCTION normalize_phone_to_e164(phone_text TEXT)
RETURNS TEXT AS $$
DECLARE
    digits TEXT;
    normalized TEXT;
BEGIN
    -- Return NULL if input is NULL or empty
    IF phone_text IS NULL OR phone_text = '' THEN
        RETURN NULL;
    END IF;

    -- Remove all non-digit characters
    digits := regexp_replace(phone_text, '[^0-9]', '', 'g');

    -- Check if it's a valid length (10-15 digits)
    IF length(digits) < 10 OR length(digits) > 15 THEN
        RETURN NULL;
    END IF;

    -- Handle US/Canada numbers (10 digits)
    IF length(digits) = 10 THEN
        RETURN '+1' || digits;
    END IF;

    -- Handle numbers with country code (11 digits starting with 1)
    IF length(digits) = 11 AND substring(digits, 1, 1) = '1' THEN
        RETURN '+' || digits;
    END IF;

    -- Handle international numbers (more than 11 digits)
    IF length(digits) > 11 THEN
        RETURN '+' || digits;
    END IF;

    -- Invalid format
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Normalize businesses.phone_number
UPDATE businesses
SET phone_number = normalize_phone_to_e164(phone_number)
WHERE phone_number IS NOT NULL
  AND phone_number != ''
  AND normalize_phone_to_e164(phone_number) IS NOT NULL
  AND phone_number != normalize_phone_to_e164(phone_number);

-- Normalize businesses.phone
UPDATE businesses
SET phone = normalize_phone_to_e164(phone)
WHERE phone IS NOT NULL
  AND phone != ''
  AND normalize_phone_to_e164(phone) IS NOT NULL
  AND phone != normalize_phone_to_e164(phone);

-- Ensure phone_number and phone are consistent (use phone_number as source of truth)
UPDATE businesses
SET phone = phone_number
WHERE phone_number IS NOT NULL
  AND phone_number != ''
  AND (phone IS NULL OR phone != phone_number);

-- Normalize toll_free_numbers.number
UPDATE toll_free_numbers
SET number = normalize_phone_to_e164(number)
WHERE number IS NOT NULL
  AND number != ''
  AND normalize_phone_to_e164(number) IS NOT NULL
  AND number != normalize_phone_to_e164(number);

-- Normalize ai_agents.phone_number
UPDATE ai_agents
SET phone_number = normalize_phone_to_e164(phone_number)
WHERE phone_number IS NOT NULL
  AND phone_number != ''
  AND normalize_phone_to_e164(phone_number) IS NOT NULL
  AND phone_number != normalize_phone_to_e164(phone_number);

-- Update ai_agents.phone_number from businesses.phone_number if missing
UPDATE ai_agents
SET phone_number = (
    SELECT phone_number
    FROM businesses
    WHERE businesses.id = ai_agents.business_id
      AND businesses.phone_number IS NOT NULL
)
WHERE phone_number IS NULL
  AND business_id IN (
    SELECT id FROM businesses WHERE phone_number IS NOT NULL
  );

-- Log summary (this will appear in PostgreSQL logs)
DO $$
DECLARE
    businesses_normalized INTEGER;
    toll_free_normalized INTEGER;
    agents_normalized INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_normalized
    FROM businesses
    WHERE phone_number IS NOT NULL
      AND phone_number LIKE '+%';

    SELECT COUNT(*) INTO toll_free_normalized
    FROM toll_free_numbers
    WHERE number IS NOT NULL
      AND number LIKE '+%';

    SELECT COUNT(*) INTO agents_normalized
    FROM ai_agents
    WHERE phone_number IS NOT NULL
      AND phone_number LIKE '+%';

    RAISE NOTICE 'Phone normalization complete:';
    RAISE NOTICE '  Businesses with normalized phone numbers: %', businesses_normalized;
    RAISE NOTICE '  Toll-free numbers normalized: %', toll_free_normalized;
    RAISE NOTICE '  AI agents with normalized phone numbers: %', agents_normalized;
END $$;

-- Clean up function (optional - can be kept for future use)
-- DROP FUNCTION IF EXISTS normalize_phone_to_e164(TEXT);

