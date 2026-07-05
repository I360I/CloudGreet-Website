-- Scraper-quality audit fixes (applied live as migration
-- normalize_lead_phones_merge_dupes_unique):
--  1. Canonicalize all leads.phone to +1XXXXXXXXXX (25% were stored in
--     display formats like '+1 210-870-4459', which broke phone-equality
--     dedupe and was the source of the duplicate leads).
--  2. Null out junk shapes: invalid NANP area code/exchange, ten
--     identical digits, fictional 555-01XX range.
--  3. Merge duplicate-phone leads into the oldest row per phone,
--     repointing lead_assignments (dropping PK-conflicting dupes),
--     lead_notes, rep_messages, rep_calls, scrape_results.
--  4. UNIQUE INDEX leads_phone_unique ON leads(phone) WHERE phone IS NOT
--     NULL - promote's read-then-insert can no longer race into dupes.
--  5. Flip assignments of CLOSED businesses to 'dead' so they leave the
--     dial queues (promote.ts now gates these at ingestion too).

UPDATE leads SET phone = sub.norm
FROM (
  SELECT id,
    CASE
      WHEN length(d) = 10 THEN '+1' || d
      WHEN length(d) = 11 AND d LIKE '1%' THEN '+' || substr(d, 1, 11)
      WHEN length(d) >= 11 THEN '+1' || right(d, 10)
      ELSE NULL
    END AS norm
  FROM (SELECT id, regexp_replace(phone, '[^0-9]', '', 'g') AS d FROM leads WHERE phone IS NOT NULL) x
) sub
WHERE leads.id = sub.id AND leads.phone IS DISTINCT FROM sub.norm;

UPDATE leads SET phone = NULL
WHERE phone IS NOT NULL AND (
  phone !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'
  OR substring(phone from 3) ~ '^([0-9])\1{9}$'
  OR substring(phone from 6 for 5) = '55501'
);

CREATE TEMP TABLE dupe_map AS
SELECT id AS dupe_id, keeper
FROM (
  SELECT id, first_value(id) OVER (PARTITION BY phone ORDER BY created_at ASC, id ASC) AS keeper
  FROM leads WHERE phone IS NOT NULL
) r
WHERE id <> keeper;

DELETE FROM lead_assignments a
USING dupe_map m
WHERE a.lead_id = m.dupe_id
  AND EXISTS (SELECT 1 FROM lead_assignments k WHERE k.lead_id = m.keeper AND k.rep_id = a.rep_id);
UPDATE lead_assignments a SET lead_id = m.keeper FROM dupe_map m WHERE a.lead_id = m.dupe_id;
UPDATE lead_notes n SET lead_id = m.keeper FROM dupe_map m WHERE n.lead_id = m.dupe_id;
UPDATE rep_messages x SET lead_id = m.keeper FROM dupe_map m WHERE x.lead_id = m.dupe_id;
UPDATE rep_calls c SET lead_id = m.keeper FROM dupe_map m WHERE c.lead_id = m.dupe_id;
UPDATE scrape_results s SET promoted_lead_id = m.keeper FROM dupe_map m WHERE s.promoted_lead_id = m.dupe_id;
DELETE FROM leads l USING dupe_map m WHERE l.id = m.dupe_id;

CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique ON leads (phone) WHERE phone IS NOT NULL;

UPDATE lead_assignments SET status = 'dead', last_touched_at = now()
WHERE lead_id IN (SELECT id FROM leads WHERE google_business_status ILIKE '%CLOSED%')
  AND status NOT IN ('dead', 'do_not_call');
