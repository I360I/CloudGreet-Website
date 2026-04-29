# CloudGreet API Documentation

## Base URL
```
Production: https://cloudgreet.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained via `/api/auth/login-simple` or `/api/auth/register-simple`.

## Public Endpoints

### Health Check
```
GET /health
```
Returns application health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Initiate Call (Landing Page)
```
POST /telnyx/initiate-call
```
Initiates a call from the landing page.

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "businessId": "optional-business-id",
  "businessInfo": {
    "name": "Test Business",
    "type": "HVAC"
  }
}
```

**Response:**
```json
{
  "success": true,
  "callControlId": "call-id",
  "message": "Call initiated"
}
```

**Rate Limit:** 5 requests per 15 minutes

## Authentication Endpoints

### Register
```
POST /auth/register-simple
```
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

**Rate Limit:** 10 requests per 15 minutes

### Login
```
POST /auth/login-simple
```
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "client"
  }
}
```

**Rate Limit:** 10 requests per 15 minutes

## Client Endpoints

### Dashboard Data
```
GET /dashboard/data
```
Get dashboard data for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "businessId": "business-id",
  "businessName": "My Business",
  "phoneNumber": "+18001234567",
  "totalCalls": 42,
  "totalAppointments": 15,
  "totalRevenue": 5000,
  "recentCalls": [...],
  "upcomingAppointments": [...]
}
```

### Client Billing
```
GET /client/billing
```
Get billing information for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "billing": {
    "subscriptionStatus": "active",
    "mrrCents": 9900,
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "nextInvoiceDate": "2024-02-01T00:00:00.000Z",
    "nextInvoiceAmountCents": 14900,
    "bookingFeesLast30DaysCents": 50000,
    "bookingsLast30Days": 10,
    "portalUrl": "https://billing.stripe.com/..."
  }
}
```

### Test Call
```
POST /client/test-call
```
Initiate a test call to the user's assigned phone number.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phoneNumber": "+15551234567"
}
```

**Response:**
```json
{
  "success": true,
  "callControlId": "call-id",
  "message": "Test call initiated"
}
```

**Rate Limit:** 10 requests per 15 minutes

## Onboarding Endpoints

### Get Onboarding State
```
GET /onboarding/state
```
Get current onboarding state for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "business": {
    "id": "business-id",
    "business_name": "My Business",
    "onboarding_completed": false,
    "onboarding_step": 2
  },
  "onboarding": {
    "completed": false,
    "step": 2
  }
}
```

### Complete Onboarding
```
POST /onboarding/complete
```
Complete the onboarding process.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "businessName": "My Business",
  "businessType": "HVAC",
  "email": "business@example.com",
  "phone": "+15551234567",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "website": "https://example.com",
  "services": ["Installation", "Repair"],
  "serviceAreas": ["Austin", "San Antonio"],
  "businessHours": {...},
  "greetingMessage": "Hello, thank you for calling...",
  "tone": "professional",
  "description": "We provide HVAC services..."
}
```

**Response:**
```json
{
  "success": true,
  "businessId": "business-id",
  "retellAgentId": "agent-id",
  "phoneNumber": "+18001234567",
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## Admin Endpoints

All admin endpoints require admin authentication.

### List Clients
```
GET /admin/clients?status=active&search=term&limit=20&offset=0
```
List all clients with pagination and filtering.

**Query Parameters:**
- `status` - Filter by status (active, inactive, suspended, cancelled)
- `search` - Search by business name, email, or phone
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "clients": [...],
  "statistics": {
    "total": 100,
    "active": 75,
    "inactive": 15,
    "suspended": 5,
    "cancelled": 5
  },
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Client Details
```
GET /admin/clients/:id
```
Get detailed information about a specific client.

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "client-id",
    "business_name": "Client Business",
    "email": "client@example.com",
    "phone_number": "+18001234567",
    "subscription_status": "active",
    "owner": {...},
    "activity": {
      "calls": {...},
      "appointments": {...},
      "revenue": {...}
    },
    "aiAgent": {...}
  }
}
```

### Usage Analytics
```
GET /admin/analytics/usage
```
Get usage analytics (admin only, returns system-wide if no businessId).

**Response:**
```json
{
  "success": true,
  "analytics": {
    "summary": {
      "calls30": 1000,
      "calls7": 250,
      "appointments30": 150,
      "outreach30": 500,
      "revenue30": 50000,
      "conversionRate": 0.15
    },
    "trends": [...],
    "churn": {...},
    "recentCalls": [...]
  }
}
```

### Billing Reconciliation
```
GET /admin/billing/reconciliation
```
Get billing reconciliation summary.

**Response:**
```json
{
  "success": true,
  "summary": {
    "mrrCents": 99000,
    "bookingFeesCents": 50000,
    "totalBilledCents": 149000,
    "openAlerts": [...],
    "pastDueInvoices": [...]
  }
}
```

## Webhook Endpoints

### Stripe Webhook
```
POST /stripe/webhook
```
Handles Stripe webhook events.

**Headers:**
```
stripe-signature: <signature>
```

**Events Handled:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.created` - Create subscription record
- `customer.subscription.updated` - Update subscription
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Log payment
- `invoice.payment_failed` - Handle payment failure

### Retell Voice Webhook
```
POST /retell/voice-webhook
```
Handles Retell AI voice agent events.

**Headers:**
```
x-retell-signature: <signature>
```

**Events Handled:**
- `ping` - Health check
- `tool_call` - AI agent actions (e.g., `book_appointment`)

### Telnyx Voice Webhook
```
POST /telnyx/voice-webhook
```
Handles Telnyx voice call events.

**Events Handled:**
- `call.initiated` - Bridge to Retell AI
- `call.answered` - Update call status
- `call.ended` - Log call completion

## Async Operations

### Email and SMS Endpoints

Email and SMS sending endpoints queue jobs for asynchronous processing. The API returns immediately with a success response, and the actual sending happens in the background via the job queue.

**Affected Endpoints:**
- `POST /contact/submit` - Contact form emails
- `POST /sms/send` - SMS messages
- `POST /admin/message-client` - Admin email/SMS to clients

**Response Format:**
```json
{
  "success": true,
  "message": "Email queued successfully. It will be sent shortly."
}
```

**Job Processing:**
- Jobs are processed by the cron job at `/api/cron/process-jobs`
- Default schedule: Every hour (configurable in Vercel)
- Failed jobs retry up to 3 times with exponential backoff
- Check job status in `background_jobs` table

**Monitoring:**
```sql
-- Check pending jobs
SELECT * FROM background_jobs WHERE status = 'pending' ORDER BY created_at DESC;

-- Check failed jobs
SELECT * FROM background_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

## Transaction Guarantees

### Appointment Creation

Appointment creation uses database transaction functions to ensure atomicity:

**Endpoint:** `POST /retell/voice-webhook` (via `book_appointment` tool)

**Transaction Function:** `create_appointment_safe`

**Guarantees:**
- Atomic operation: Appointment creation and compliance logging happen in a single transaction
- Automatic rollback on errors
- Compliance event logging included in transaction
- Returns appointment ID on success

**On Failure:**
- Entire transaction rolls back
- No partial data written
- Error logged with full context

### Onboarding Completion

Onboarding completion uses transaction functions for data integrity:

**Endpoint:** `POST /onboarding/complete`

**Transaction Function:** `complete_onboarding_safe`

**Guarantees:**
- Atomic update of `onboarding_completed` flag
- AI agent creation (if needed) included in transaction
- Compliance event logging included
- Returns boolean success status

**On Failure:**
- Transaction rolls back
- Business remains in previous onboarding state
- Error logged with business and user context

## Rate Limiting

All API endpoints implement rate limiting using Redis (with in-memory fallback).

### Rate Limit Tiers

- **Strict:** 5 requests per 15 minutes
  - Public call initiation (`/telnyx/initiate-call`)
  
- **Auth:** 10 requests per 15 minutes
  - Login (`/auth/login-simple`)
  - Registration (`/auth/register-simple`)
  
- **Moderate:** 100 requests per 15 minutes
  - Contact form (`/contact/submit`)
  - Client test calls (`/client/test-call`)
  
- **Lenient:** 1000 requests per 15 minutes
  - Internal admin APIs
  - Dashboard endpoints

### Rate Limit Headers

All rate-limited endpoints return standard headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1704067200
Retry-After: 300
```

### Rate Limit Responses

When rate limit is exceeded:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

**Status Code:** `429 Too Many Requests`

**Redis Configuration:**
- Uses Upstash Redis for distributed rate limiting
- Falls back to in-memory storage if Redis not configured
- **Note:** In-memory fallback is NOT suitable for production serverless environments

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Request Size Limits

Maximum request body size: **1MB**

Larger requests will return `413 Payload Too Large`.

## Timeouts

- **API Requests:** 30 seconds
- **Database Queries:** 15 seconds
- **External APIs (Telnyx, Stripe):** 15 seconds
- **OpenAI API:** 20 seconds

## GDPR Endpoints

### Export Data
```
GET /user/gdpr/export
```
Export all user data in JSON format.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** JSON file download

### Delete Data
```
DELETE /user/gdpr/delete
```
Anonymize and delete user data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Your data has been successfully anonymized and deleted."
}
```

## Support

For API questions or issues:
- Email: founders@cloudgreet.com
- Documentation: https://cloudgreet.com/docs


## Base URL
```
Production: https://cloudgreet.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained via `/api/auth/login-simple` or `/api/auth/register-simple`.

## Public Endpoints

### Health Check
```
GET /health
```
Returns application health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Initiate Call (Landing Page)
```
POST /telnyx/initiate-call
```
Initiates a call from the landing page.

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "businessId": "optional-business-id",
  "businessInfo": {
    "name": "Test Business",
    "type": "HVAC"
  }
}
```

**Response:**
```json
{
  "success": true,
  "callControlId": "call-id",
  "message": "Call initiated"
}
```

**Rate Limit:** 5 requests per 15 minutes

## Authentication Endpoints

### Register
```
POST /auth/register-simple
```
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

**Rate Limit:** 10 requests per 15 minutes

### Login
```
POST /auth/login-simple
```
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "client"
  }
}
```

**Rate Limit:** 10 requests per 15 minutes

## Client Endpoints

### Dashboard Data
```
GET /dashboard/data
```
Get dashboard data for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "businessId": "business-id",
  "businessName": "My Business",
  "phoneNumber": "+18001234567",
  "totalCalls": 42,
  "totalAppointments": 15,
  "totalRevenue": 5000,
  "recentCalls": [...],
  "upcomingAppointments": [...]
}
```

### Client Billing
```
GET /client/billing
```
Get billing information for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "billing": {
    "subscriptionStatus": "active",
    "mrrCents": 9900,
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "nextInvoiceDate": "2024-02-01T00:00:00.000Z",
    "nextInvoiceAmountCents": 14900,
    "bookingFeesLast30DaysCents": 50000,
    "bookingsLast30Days": 10,
    "portalUrl": "https://billing.stripe.com/..."
  }
}
```

### Test Call
```
POST /client/test-call
```
Initiate a test call to the user's assigned phone number.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phoneNumber": "+15551234567"
}
```

**Response:**
```json
{
  "success": true,
  "callControlId": "call-id",
  "message": "Test call initiated"
}
```

**Rate Limit:** 10 requests per 15 minutes

## Onboarding Endpoints

### Get Onboarding State
```
GET /onboarding/state
```
Get current onboarding state for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "business": {
    "id": "business-id",
    "business_name": "My Business",
    "onboarding_completed": false,
    "onboarding_step": 2
  },
  "onboarding": {
    "completed": false,
    "step": 2
  }
}
```

### Complete Onboarding
```
POST /onboarding/complete
```
Complete the onboarding process.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "businessName": "My Business",
  "businessType": "HVAC",
  "email": "business@example.com",
  "phone": "+15551234567",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "website": "https://example.com",
  "services": ["Installation", "Repair"],
  "serviceAreas": ["Austin", "San Antonio"],
  "businessHours": {...},
  "greetingMessage": "Hello, thank you for calling...",
  "tone": "professional",
  "description": "We provide HVAC services..."
}
```

**Response:**
```json
{
  "success": true,
  "businessId": "business-id",
  "retellAgentId": "agent-id",
  "phoneNumber": "+18001234567",
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## Admin Endpoints

All admin endpoints require admin authentication.

### List Clients
```
GET /admin/clients?status=active&search=term&limit=20&offset=0
```
List all clients with pagination and filtering.

**Query Parameters:**
- `status` - Filter by status (active, inactive, suspended, cancelled)
- `search` - Search by business name, email, or phone
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "clients": [...],
  "statistics": {
    "total": 100,
    "active": 75,
    "inactive": 15,
    "suspended": 5,
    "cancelled": 5
  },
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Client Details
```
GET /admin/clients/:id
```
Get detailed information about a specific client.

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "client-id",
    "business_name": "Client Business",
    "email": "client@example.com",
    "phone_number": "+18001234567",
    "subscription_status": "active",
    "owner": {...},
    "activity": {
      "calls": {...},
      "appointments": {...},
      "revenue": {...}
    },
    "aiAgent": {...}
  }
}
```

### Usage Analytics
```
GET /admin/analytics/usage
```
Get usage analytics (admin only, returns system-wide if no businessId).

**Response:**
```json
{
  "success": true,
  "analytics": {
    "summary": {
      "calls30": 1000,
      "calls7": 250,
      "appointments30": 150,
      "outreach30": 500,
      "revenue30": 50000,
      "conversionRate": 0.15
    },
    "trends": [...],
    "churn": {...},
    "recentCalls": [...]
  }
}
```

### Billing Reconciliation
```
GET /admin/billing/reconciliation
```
Get billing reconciliation summary.

**Response:**
```json
{
  "success": true,
  "summary": {
    "mrrCents": 99000,
    "bookingFeesCents": 50000,
    "totalBilledCents": 149000,
    "openAlerts": [...],
    "pastDueInvoices": [...]
  }
}
```

## Webhook Endpoints

### Stripe Webhook
```
POST /stripe/webhook
```
Handles Stripe webhook events.

**Headers:**
```
stripe-signature: <signature>
```

**Events Handled:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.created` - Create subscription record
- `customer.subscription.updated` - Update subscription
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Log payment
- `invoice.payment_failed` - Handle payment failure

### Retell Voice Webhook
```
POST /retell/voice-webhook
```
Handles Retell AI voice agent events.

**Headers:**
```
x-retell-signature: <signature>
```

**Events Handled:**
- `ping` - Health check
- `tool_call` - AI agent actions (e.g., `book_appointment`)

### Telnyx Voice Webhook
```
POST /telnyx/voice-webhook
```
Handles Telnyx voice call events.

**Events Handled:**
- `call.initiated` - Bridge to Retell AI
- `call.answered` - Update call status
- `call.ended` - Log call completion

## Async Operations

### Email and SMS Endpoints

Email and SMS sending endpoints queue jobs for asynchronous processing. The API returns immediately with a success response, and the actual sending happens in the background via the job queue.

**Affected Endpoints:**
- `POST /contact/submit` - Contact form emails
- `POST /sms/send` - SMS messages
- `POST /admin/message-client` - Admin email/SMS to clients

**Response Format:**
```json
{
  "success": true,
  "message": "Email queued successfully. It will be sent shortly."
}
```

**Job Processing:**
- Jobs are processed by the cron job at `/api/cron/process-jobs`
- Default schedule: Every hour (configurable in Vercel)
- Failed jobs retry up to 3 times with exponential backoff
- Check job status in `background_jobs` table

**Monitoring:**
```sql
-- Check pending jobs
SELECT * FROM background_jobs WHERE status = 'pending' ORDER BY created_at DESC;

-- Check failed jobs
SELECT * FROM background_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

## Transaction Guarantees

### Appointment Creation

Appointment creation uses database transaction functions to ensure atomicity:

**Endpoint:** `POST /retell/voice-webhook` (via `book_appointment` tool)

**Transaction Function:** `create_appointment_safe`

**Guarantees:**
- Atomic operation: Appointment creation and compliance logging happen in a single transaction
- Automatic rollback on errors
- Compliance event logging included in transaction
- Returns appointment ID on success

**On Failure:**
- Entire transaction rolls back
- No partial data written
- Error logged with full context

### Onboarding Completion

Onboarding completion uses transaction functions for data integrity:

**Endpoint:** `POST /onboarding/complete`

**Transaction Function:** `complete_onboarding_safe`

**Guarantees:**
- Atomic update of `onboarding_completed` flag
- AI agent creation (if needed) included in transaction
- Compliance event logging included
- Returns boolean success status

**On Failure:**
- Transaction rolls back
- Business remains in previous onboarding state
- Error logged with business and user context

## Rate Limiting

All API endpoints implement rate limiting using Redis (with in-memory fallback).

### Rate Limit Tiers

- **Strict:** 5 requests per 15 minutes
  - Public call initiation (`/telnyx/initiate-call`)
  
- **Auth:** 10 requests per 15 minutes
  - Login (`/auth/login-simple`)
  - Registration (`/auth/register-simple`)
  
- **Moderate:** 100 requests per 15 minutes
  - Contact form (`/contact/submit`)
  - Client test calls (`/client/test-call`)
  
- **Lenient:** 1000 requests per 15 minutes
  - Internal admin APIs
  - Dashboard endpoints

### Rate Limit Headers

All rate-limited endpoints return standard headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1704067200
Retry-After: 300
```

### Rate Limit Responses

When rate limit is exceeded:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

**Status Code:** `429 Too Many Requests`

**Redis Configuration:**
- Uses Upstash Redis for distributed rate limiting
- Falls back to in-memory storage if Redis not configured
- **Note:** In-memory fallback is NOT suitable for production serverless environments

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Request Size Limits

Maximum request body size: **1MB**

Larger requests will return `413 Payload Too Large`.

## Timeouts

- **API Requests:** 30 seconds
- **Database Queries:** 15 seconds
- **External APIs (Telnyx, Stripe):** 15 seconds
- **OpenAI API:** 20 seconds

## GDPR Endpoints

### Export Data
```
GET /user/gdpr/export
```
Export all user data in JSON format.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** JSON file download

### Delete Data
```
DELETE /user/gdpr/delete
```
Anonymize and delete user data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Your data has been successfully anonymized and deleted."
}
```

## Support

For API questions or issues:
- Email: founders@cloudgreet.com
- Documentation: https://cloudgreet.com/docs

