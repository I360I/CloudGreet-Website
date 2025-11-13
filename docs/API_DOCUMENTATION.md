# CloudGreet API Documentation

## Overview

The CloudGreet API provides comprehensive endpoints for managing AI-powered business communications, lead qualification, appointment scheduling, and customer engagement. All API endpoints are RESTful and return JSON responses.

## Base URL

```
Production: https://cloudgreet.vercel.app/api
Staging: https://cloudgreet-staging.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints (except health checks and webhooks) require authentication using JWT tokens.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Format
```typescript
interface JWTPayload {
  sub: string;           // User ID
  business_id: string;   // Business ID for multi-tenancy
  role: 'admin' | 'user' | 'agent';
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": ["Error message"],
    "anotherField": ["Another error message"]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid request data |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 422  | Unprocessable Entity - Validation failed |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error - Server error |
| 503  | Service Unavailable - Service temporarily unavailable |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authenticated Users**: 1000 requests per hour
- **Anonymous Users**: 100 requests per hour
- **Webhook Endpoints**: 10000 requests per hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Endpoints

### Health Check

#### GET /health
Check system health status.

**Query Parameters:**
- `detailed` (boolean, optional): Include detailed health information
- `cache` (boolean, optional): Use cached health data (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "checks": [
      {
        "name": "database",
        "status": "healthy",
        "message": "Database is healthy. Query time: 45ms",
        "duration": 45,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400000,
    "environment": "production"
  }
}
```

### Authentication

#### POST /auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "business_id": "business_456",
      "role": "admin"
    },
    "expires_in": 3600
  }
}
```

#### POST /auth/register
Register new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "business_name": "My Business",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_123",
  "password": "newpassword123"
}
```

### Businesses

#### GET /businesses
List all businesses for authenticated user.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search by business name

**Response:**
```json
{
  "success": true,
  "data": {
    "businesses": [
      {
        "id": "business_123",
        "name": "My Business",
        "settings": {
          "timezone": "America/New_York",
          "business_hours": { ... }
        },
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### POST /businesses
Create new business.

**Request Body:**
```json
{
  "name": "My Business",
  "settings": {
    "timezone": "America/New_York",
    "business_hours": {
      "monday": { "open": "09:00", "close": "17:00" },
      "tuesday": { "open": "09:00", "close": "17:00" }
    }
  }
}
```

#### GET /businesses/{id}
Get specific business.

**Path Parameters:**
- `id` (string): Business ID

#### PUT /businesses/{id}
Update business.

**Path Parameters:**
- `id` (string): Business ID

**Request Body:**
```json
{
  "name": "Updated Business Name",
  "settings": {
    "timezone": "America/Los_Angeles"
  }
}
```

### AI Agents

#### GET /agents
List AI agents for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `status` (string, optional): Filter by status (active, inactive)

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent_123",
        "business_id": "business_456",
        "name": "Sales Agent",
        "voice_settings": {
          "voice_id": "voice_123",
          "speed": 1.0,
          "pitch": 1.0
        },
        "behavior_settings": {
          "personality": "professional",
          "conversation_style": "friendly"
        },
        "is_active": true,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### POST /agents
Create new AI agent.

**Request Body:**
```json
{
  "business_id": "business_456",
  "name": "Sales Agent",
  "voice_settings": {
    "voice_id": "voice_123",
    "speed": 1.0,
    "pitch": 1.0
  },
  "behavior_settings": {
    "personality": "professional",
    "conversation_style": "friendly",
    "escalation_triggers": ["angry", "confused"]
  },
  "working_hours": {
    "monday": { "open": "09:00", "close": "17:00" }
  }
}
```

#### POST /agents/{id}/start
Start AI agent.

**Path Parameters:**
- `id` (string): Agent ID

#### POST /agents/{id}/stop
Stop AI agent.

**Path Parameters:**
- `id` (string): Agent ID

#### GET /agents/{id}/status
Get agent status.

**Path Parameters:**
- `id` (string): Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent_123",
    "status": "active",
    "active_calls": 2,
    "total_calls_today": 15,
    "uptime": 3600000
  }
}
```

### Leads

#### GET /leads
List leads for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `status` (string, optional): Filter by status (new, qualified, unqualified, converted)
- `source` (string, optional): Filter by source (call, sms, email, web)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "lead_123",
        "business_id": "business_456",
        "phone": "+1234567890",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "qualified",
        "source": "call",
        "qualification_score": 85,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### POST /leads
Create new lead.

**Request Body:**
```json
{
  "business_id": "business_456",
  "phone": "+1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "source": "web",
  "notes": "Interested in premium package"
}
```

#### GET /leads/{id}
Get specific lead.

**Path Parameters:**
- `id` (string): Lead ID

#### PUT /leads/{id}
Update lead.

**Path Parameters:**
- `id` (string): Lead ID

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com",
  "status": "qualified",
  "notes": "Updated notes"
}
```

#### POST /leads/{id}/qualify
Qualify lead with AI scoring.

**Path Parameters:**
- `id` (string): Lead ID

**Request Body:**
```json
{
  "criteria": {
    "budget": "high",
    "timeline": "immediate",
    "decision_maker": true
  }
}
```

### Appointments

#### GET /appointments
List appointments for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `status` (string, optional): Filter by status (scheduled, confirmed, completed, cancelled)
- `start_date` (string, optional): Filter by start date (ISO 8601)
- `end_date` (string, optional): Filter by end date (ISO 8601)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "appointment_123",
        "business_id": "business_456",
        "lead_id": "lead_789",
        "scheduled_date": "2024-01-20T14:00:00Z",
        "duration": 30,
        "status": "scheduled",
        "type": "consultation",
        "notes": "Initial consultation call",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### POST /appointments
Create new appointment.

**Request Body:**
```json
{
  "business_id": "business_456",
  "lead_id": "lead_789",
  "scheduled_date": "2024-01-20T14:00:00Z",
  "duration": 30,
  "type": "consultation",
  "notes": "Initial consultation call"
}
```

#### GET /appointments/{id}
Get specific appointment.

**Path Parameters:**
- `id` (string): Appointment ID

#### PUT /appointments/{id}
Update appointment.

**Path Parameters:**
- `id` (string): Appointment ID

**Request Body:**
```json
{
  "scheduled_date": "2024-01-21T15:00:00Z",
  "status": "confirmed",
  "notes": "Updated notes"
}
```

#### DELETE /appointments/{id}
Cancel appointment.

**Path Parameters:**
- `id` (string): Appointment ID

#### POST /appointments/{id}/remind
Send appointment reminder.

**Path Parameters:**
- `id` (string): Appointment ID

**Request Body:**
```json
{
  "method": "sms",
  "message": "Reminder: You have an appointment tomorrow at 2 PM"
}
```

### Communications

#### GET /calls
List calls for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `lead_id` (string, optional): Filter by lead ID
- `status` (string, optional): Filter by status (completed, failed, in_progress)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call_123",
        "business_id": "business_456",
        "lead_id": "lead_789",
        "phone": "+1234567890",
        "duration": 180,
        "status": "completed",
        "recording_url": "https://recordings.example.com/call_123.mp3",
        "transcript": "Hello, this is John...",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### GET /sms
List SMS messages for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `lead_id` (string, optional): Filter by lead ID
- `status` (string, optional): Filter by status (sent, delivered, failed)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

#### POST /sms
Send SMS message.

**Request Body:**
```json
{
  "business_id": "business_456",
  "lead_id": "lead_789",
  "phone": "+1234567890",
  "message": "Thank you for your interest! We'll call you soon."
}
```

#### GET /emails
List emails for business.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `lead_id` (string, optional): Filter by lead ID
- `status` (string, optional): Filter by status (sent, delivered, failed)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

#### POST /emails
Send email.

**Request Body:**
```json
{
  "business_id": "business_456",
  "lead_id": "lead_789",
  "to": "john@example.com",
  "subject": "Thank you for your interest",
  "content": "Thank you for your interest in our services..."
}
```

### Analytics

#### GET /analytics/overview
Get business analytics overview.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `start_date` (string, optional): Start date (ISO 8601)
- `end_date` (string, optional): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": {
      "total": 150,
      "new_today": 5,
      "qualified": 45,
      "converted": 12
    },
    "appointments": {
      "total": 80,
      "scheduled_today": 3,
      "completed": 65,
      "cancelled": 8
    },
    "calls": {
      "total": 200,
      "today": 15,
      "average_duration": 180,
      "success_rate": 0.85
    },
    "revenue": {
      "total": 50000,
      "this_month": 5000,
      "growth_rate": 0.15
    }
  }
}
```

#### GET /analytics/leads/scored
Get lead scoring analytics.

**Query Parameters:**
- `business_id` (string, required): Business ID
- `start_date` (string, optional): Start date (ISO 8601)
- `end_date` (string, optional): End date (ISO 8601)

### Webhooks

#### POST /webrtc/webhook
Telnyx voice webhook endpoint.

**Request Body:**
```json
{
  "event_type": "call.answered",
  "data": {
    "call_control_id": "call_123",
    "call_leg_id": "leg_456",
    "from": "+1234567890",
    "to": "+0987654321"
  }
}
```

#### POST /sms/webhook
Telnyx SMS webhook endpoint.

**Request Body:**
```json
{
  "event_type": "message.received",
  "data": {
    "from": "+1234567890",
    "to": "+0987654321",
    "text": "Hello, I'm interested in your services"
  }
}
```

#### POST /retell/webhook
Retell AI webhook endpoint.

**Request Body:**
```json
{
  "event_type": "conversation.ended",
  "data": {
    "conversation_id": "conv_123",
    "transcript": "Hello, this is John...",
    "outcome": "appointment_scheduled"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_INVALID_TOKEN` | Invalid or expired token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | Insufficient permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Resource not found |
| `RESOURCE_ALREADY_EXISTS` | Resource already exists |
| `BUSINESS_NOT_FOUND` | Business not found |
| `LEAD_NOT_FOUND` | Lead not found |
| `APPOINTMENT_NOT_FOUND` | Appointment not found |
| `AGENT_NOT_FOUND` | AI agent not found |
| `EXTERNAL_SERVICE_ERROR` | External service error |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | Internal server error |

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @cloudgreet/api-client
```

```typescript
import { CloudGreetClient } from '@cloudgreet/api-client';

const client = new CloudGreetClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://cloudgreet.vercel.app/api'
});

// Get leads
const leads = await client.leads.list({
  business_id: 'business_123'
});
```

### Python
```bash
pip install cloudgreet-api
```

```python
from cloudgreet import CloudGreetClient

client = CloudGreetClient(
    api_key='your-api-key',
    base_url='https://cloudgreet.vercel.app/api'
)

# Get leads
leads = client.leads.list(business_id='business_123')
```

## Testing

### Postman Collection
Download our Postman collection for easy API testing:
[CloudGreet API Collection](https://www.postman.com/cloudgreet/workspace/cloudgreet-api)

### cURL Examples

#### Create Lead
```bash
curl -X POST https://cloudgreet.vercel.app/api/leads \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "business_123",
    "phone": "+1234567890",
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

#### Get Appointments
```bash
curl -X GET "https://cloudgreet.vercel.app/api/appointments?business_id=business_123" \
  -H "Authorization: Bearer your-jwt-token"
```

## Support

For API support and questions:
- **Email**: api-support@cloudgreet.com
- **Documentation**: https://docs.cloudgreet.com
- **Status Page**: https://status.cloudgreet.com
- **GitHub Issues**: https://github.com/cloudgreet/api/issues











