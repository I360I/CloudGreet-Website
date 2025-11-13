# Secrets Management Guide

This document outlines the comprehensive secrets management system for CloudGreet, including secure storage, rotation procedures, and monitoring.

## Overview

The secrets management system provides:
- Secure storage and encryption of sensitive data
- Automated rotation schedules
- Validation and monitoring
- Audit trails and reporting
- Rollback capabilities

## Architecture

### Components

1. **SecretsManager** (`lib/secrets-manager.ts`)
   - Core secrets management class
   - Encryption/decryption functionality
   - Rotation scheduling
   - Singleton pattern for global access

2. **Rotation Script** (`scripts/rotate-secrets.js`)
   - Manual and automated secret rotation
   - Backup and rollback functionality
   - Validation of new secrets

3. **Validation Script** (`scripts/validate-secrets.js`)
   - Secret format validation
   - Required secrets checking
   - Security strength assessment

4. **Monitoring Script** (`scripts/monitor-secrets.js`)
   - Security monitoring and reporting
   - Age and strength tracking
   - Usage analysis

## Secret Types

### Critical Secrets (Must be present)
- `JWT_SECRET` - JWT signing secret
- `SUPABASE_SERVICE_ROLE_KEY` - Database access
- `OPENAI_API_KEY` - AI services
- `RETELL_API_KEY` - Voice AI
- `TELNYX_API_KEY` - Telecommunications
- `STRIPE_SECRET_KEY` - Payment processing
- `RESEND_API_KEY` - Email services

### Webhook Secrets
- `RETELL_WEBHOOK_SECRET`
- `TELNYX_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`

### Optional Secrets
- `SLACK_WEBHOOK_URL` - Monitoring alerts
- `GOOGLE_CLIENT_SECRET` - Calendar integration

## Usage

### Basic Operations

```typescript
import { secretsManager } from '@/lib/secrets-manager';

// Get a secret
const jwtSecret = secretsManager.getSecret('jwt_secret');

// Set a secret
secretsManager.setSecret('new_secret', 'value', 'api_key', 90);

// Rotate a secret
await secretsManager.rotateSecret('jwt_secret', 'new_value');
```

### Rotation Procedures

#### Manual Rotation

```bash
# Rotate all secrets
node scripts/rotate-secrets.js rotate

# Rotate specific secret
node scripts/rotate-secrets.js rotate JWT_SECRET jwt_secret

# Rollback to backup
node scripts/rotate-secrets.js rollback backups/secrets/secrets-backup-2024-01-01.json
```

#### Automated Rotation

Secrets are automatically rotated based on their configured intervals:
- JWT secrets: 90 days
- Webhook secrets: 90 days
- API keys: 365 days

### Validation

```bash
# Full validation
node scripts/validate-secrets.js validate

# Quick check for critical secrets
node scripts/validate-secrets.js check

# Generate detailed report
node scripts/validate-secrets.js report
```

### Monitoring

```bash
# Full security report
node scripts/monitor-secrets.js monitor

# Quick security check
node scripts/monitor-secrets.js check
```

## Security Features

### Encryption

All secrets are encrypted using AES-256-CBC with a rotating encryption key:
- Encryption key stored in `SECRETS_ENCRYPTION_KEY` environment variable
- Each secret encrypted with unique IV
- Keys can be rotated independently

### Access Control

- Secrets only accessible through SecretsManager
- No direct access to encrypted values
- Audit logging for all operations
- Role-based access in production

### Validation

- Format validation for each secret type
- Strength requirements (length, complexity)
- Pattern matching for API keys
- URL validation for webhooks

## Rotation Schedule

| Secret Type | Rotation Interval | Risk Level |
|-------------|------------------|------------|
| JWT Secret | 90 days | High |
| Webhook Secrets | 90 days | High |
| API Keys | 365 days | High |
| Database Keys | 180 days | Critical |

## Monitoring and Alerts

### Security Metrics

- Secret age and expiration status
- Strength assessment scores
- Usage patterns and frequency
- Access attempts and failures

### Alert Conditions

- Secrets approaching expiration (80% of max age)
- Weak secret strength detected
- Unused secrets identified
- Failed rotation attempts
- Unauthorized access attempts

### Reporting

- Daily security reports
- Weekly rotation status
- Monthly compliance reports
- Incident response logs

## Best Practices

### Secret Creation

1. Use cryptographically secure random generators
2. Meet minimum length requirements (32+ characters)
3. Include mixed case, numbers, and special characters
4. Avoid common patterns and dictionary words
5. Use unique values for each environment

### Storage

1. Never commit secrets to version control
2. Use environment variables for runtime access
3. Encrypt secrets at rest
4. Implement proper access controls
5. Regular backup and recovery testing

### Rotation

1. Rotate secrets before expiration
2. Test new secrets before deployment
3. Maintain rollback capabilities
4. Update all dependent services
5. Monitor for failures after rotation

### Monitoring

1. Regular security assessments
2. Continuous monitoring of access patterns
3. Automated alerting for anomalies
4. Regular audit of secret usage
5. Compliance reporting

## Emergency Procedures

### Secret Compromise

1. Immediately rotate compromised secret
2. Revoke old secret from all services
3. Investigate access logs
4. Update all dependent systems
5. Notify security team

### Rotation Failure

1. Check backup files
2. Verify new secret format
3. Test in staging environment
4. Rollback if necessary
5. Investigate root cause

### Access Issues

1. Verify secret format and validity
2. Check service configuration
3. Review access logs
4. Test with known good secret
5. Escalate if unresolved

## Compliance

### SOC 2 Requirements

- Access controls and authentication
- Audit trails and logging
- Data encryption at rest and in transit
- Regular security assessments
- Incident response procedures

### PCI DSS Requirements

- Strong encryption for payment data
- Secure key management
- Regular security testing
- Access control and monitoring
- Incident response capabilities

## Troubleshooting

### Common Issues

1. **Secret not found**: Check environment variables and file paths
2. **Decryption failed**: Verify encryption key and secret format
3. **Rotation failed**: Check new secret format and permissions
4. **Validation errors**: Review secret requirements and format
5. **Monitoring alerts**: Investigate security issues immediately

### Debug Commands

```bash
# Check secret status
node scripts/validate-secrets.js check

# Generate detailed report
node scripts/validate-secrets.js report

# Monitor security status
node scripts/monitor-secrets.js monitor

# Test rotation
node scripts/rotate-secrets.js rotate JWT_SECRET jwt_secret
```

## Support

For issues with secrets management:

1. Check this documentation
2. Review error logs and reports
3. Test in staging environment
4. Contact security team
5. Escalate to development team

## Changelog

- **v1.0.0** - Initial secrets management system
- **v1.1.0** - Added automated rotation
- **v1.2.0** - Enhanced monitoring and reporting
- **v1.3.0** - Added compliance features

### Monitoring Secrets
- `SYNTHETIC_MONITOR_BASE_URL` (GitHub Actions secret) – Base URL used by the hourly synthetic workflow. Set this to the production domain before enabling the workflow so the monitor targets the live environment.
- `OUTREACH_RUNNER_URL` (GitHub Actions secret) – Points at `/api/internal/outreach-runner` on the production deployment.
- `MONITOR_EMPLOYEE_EMAIL`, `MONITOR_EMPLOYEE_PASSWORD` – Credentials for the synthetic sales workspace monitor. Seed via `scripts/seed-demo-data.js` and rotate if the login changes.

### Production Environment Verification
1. Run `npm run validate:env` locally (or in CI) to confirm all required Vercel environment variables (Stripe, Telnyx, Retell, Supabase) are present.
2. In Vercel → Project Settings → Environment Variables, double-check the following have production values:
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `TELNYX_API_KEY`, `TELNYX_MESSAGING_PROFILE_ID`, `TELNYX_CONNECTION_ID`
   - `RETELL_API_KEY`, `RETELL_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Set `SYNTHETIC_MONITOR_BASE_URL` in GitHub → Settings → Secrets and variables → Actions. Use the full production URL (e.g., `https://cloudgreet.com`).
4. After secrets are in place, re-run `npm run validate:env` and `npm run synthetic:registration -- --base-url https://<production-domain>` to confirm the stack is ready.

## Owner Settings Console

- Navigate to `Admin → Settings → Integration control center` to manage provider credentials without touching Vercel/GitHub.
- Each card shows connection status, last validation timestamp, and links to provider docs.
- Click “Manage” to rotate keys; values are encrypted client-side with AES-256-GCM before hitting Supabase.
- Optional fields (e.g., Telnyx SIP connection, Clearbit) can be cleared by leaving the input blank and saving.
- Validation uses live API calls (Stripe balance, Telnyx account, Retell agents, OpenAI models, Resend domains) so the status reflects real connectivity.











