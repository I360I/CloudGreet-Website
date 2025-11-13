# Compliance & Consent Operations

## Logging Overview
- All inbound voice, SMS (including HELP/STOP/UNSTOP), and onboarding submissions write an entry to `compliance_events`.
- Columns:
  - `tenant_id` (nullable) – associated business when known.
  - `channel` – `voice`, `sms`, `email`, or `onboarding`.
  - `event_type` – normalized command (e.g. `STOP`), or logical step (`services`, `complete`).
  - `metadata` – JSON payload with masked numbers (e.g. `+1****89`).
  - `created_at` – UTC timestamp.

## Retrieval
```sql
SELECT channel, event_type, path, metadata, created_at
FROM compliance_events
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 200;
```

API endpoint: `GET /api/internal/compliance/audit` (internal token required) returns the 50 most recent events for quick audits.

## HELP/STOP Workflow
1. Telnyx webhook hits `/api/sms/webhook`.
2. We log:
   - Consent in legacy `consents` table (for backwards compatibility).
   - Redacted payload in `compliance_events`.
3. Response messages (STOP → opt-out, UNSTOP → confirm opt-in, HELP → support info) returned immediately.

## Onboarding Audit
Stages recorded:
- `business_profile` (company details)
- `services` (hours, service areas)
- `phone_assignment` (existing vs provisioned number)
- `complete` (stripe/retell summary)

Each entry includes step metadata; phone numbers are masked automatically.

## Synthetic Monitoring
- GitHub workflow: **Synthetic Voice & SMS Monitors** (hourly).
- Voice monitor (`scripts/monitor-voice-agent.js`) validates greeting and escalation path via Retell test API.
- SMS monitor (`scripts/monitor-sms-opt-in.js`) sends HELP + STOP from a sandbox number; ensures compliance pipeline is live.
- Failures alert ops via GitHub notifications (wire to Slack/email downstream).

## Incident Response Checklist
1. Identify failing channel (voice vs SMS vs onboarding).
2. Query `compliance_events` to confirm latest entries.
3. Review corresponding webhook logs (Telnyx/Retell dashboards).
4. If external provider issue, coordinate with vendor support and pause outbound traffic as needed.
5. Document remediation in shared ops log; include SQL queries and monitor run IDs.

## Data Retention
- Retain compliance events for minimum 24 months to satisfy TCPA/A2P audit requirements.
- Avoid storing raw PII: numbers are masked at ingestion, additional metadata should exclude names/emails unless necessary.
- When exporting data for regulators, mask or encrypt before transmitting externally.

