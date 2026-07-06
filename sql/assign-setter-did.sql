-- Applied live 2026-07-06 (Supabase MCP).
--
-- The setter account had NO row in sales_rep_phone_numbers, so his
-- outbound SMS went out from the shared TELNYX_REP_SMS_FROM_NUMBER
-- fallback (+15129425428) - a number inbound routing can't map to any
-- rep, so replies vanished (proved by the owner's live test: three
-- webhook receipts, zero rep_messages rows). Fix: give the setter a
-- dedicated DID by reassigning one of the idle local-presence numbers
-- (was Aiden Crawson's inactive spare; he keeps his active DID + one
-- idle). The number stays on the same Telnyx account/profiles - only
-- our rep mapping changes.
--
-- Owner approved the reassignment (vs buying a new number) 2026-07-06.

UPDATE sales_rep_phone_numbers
SET rep_id = '2346a0b3-903a-4650-be94-532a60e40512', -- Anthony Edwards (setter)
    is_active = true,
    label = 'Setter line'
WHERE phone_number = '+17379370133';
