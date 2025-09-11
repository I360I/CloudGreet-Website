# CloudGreet API Documentation

## Overview

The CloudGreet API provides comprehensive endpoints for managing AI receptionist services, including user management, call handling, booking management, and business analytics.

## Base URL

```
Production: https://cloudgreet.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication using NextAuth.js session tokens. Include the session token in the request headers:

```
Authorization: Bearer <session_token>
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API endpoints**: 100 requests per 15 minutes
- **Webhook endpoints**: 10 requests per minute
- **Onboarding endpoints**: 3 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets
- `X-RateLimit-Used`: Total requests made in current window

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "companyName": "ACME Corp",
  "businessType": "HVAC",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "companyName": "ACME Corp",
    "businessType": "HVAC"
  }
}
```

#### POST /api/auth/reset-password
Request a password reset.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### PUT /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "newpassword"
}
```

### User Management

#### GET /api/get-user-data
Get current user data.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "id": "uuid",
  "email": "john@example.com",
  "name": "John Doe",
  "companyName": "ACME Corp",
  "businessType": "HVAC",
  "onboardingStatus": "completed",
  "phoneConnected": true,
  "retellAgentCreated": true,
  "phoneNumberAssigned": true
}
```

### Business Statistics

#### GET /api/get-business-stats
Get business performance statistics.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "totalRevenue": 15000,
  "totalCalls": 45,
  "activeJobs": 8,
  "customerRating": 4.8,
  "monthlySubscription": 200,
  "bookingFee": 50,
  "phoneNumber": "+1234567890",
  "retellAgentId": "agent_123",
  "onboardingStatus": "completed",
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### Call Management

#### GET /api/get-phone-stats
Get call statistics and logs.

**Query Parameters:**
- `phoneNumber` (required): Phone number

**Response:**
```json
{
  "totalCalls": 45,
  "totalDuration": 1800,
  "averageCallDuration": 40,
  "successRate": 85.5,
  "lastCallDate": "2024-01-15T10:30:00Z",
  "recentCalls": [
    {
      "id": "call_123",
      "caller": "+1234567890",
      "duration": 45,
      "status": "completed",
      "date": "2024-01-15T10:30:00Z",
      "summary": "Customer inquiry about HVAC service"
    }
  ]
}
```

#### GET /api/call-logs
Get detailed call logs.

**Query Parameters:**
- `userId` (required): User ID
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "calls": [
    {
      "id": "call_123",
      "caller": "+1234567890",
      "duration": 45,
      "status": "completed",
      "transcript": "Full call transcript...",
      "summary": "Customer inquiry about HVAC service",
      "bookingCreated": true,
      "date": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

### Booking Management

#### GET /api/bookings
Get user bookings.

**Query Parameters:**
- `userId` (required): User ID
- `status` (optional): Filter by status (pending, confirmed, completed, cancelled)
- `date` (optional): Filter by date (YYYY-MM-DD)

**Response:**
```json
{
  "bookings": [
    {
      "id": "booking_123",
      "customer": "John Smith",
      "service": "HVAC Repair",
      "date": "2024-01-20T14:00:00Z",
      "time": "14:00",
      "phone": "+1234567890",
      "email": "john@example.com",
      "status": "confirmed",
      "notes": "Customer reported heating issues",
      "estimatedValue": 300
    }
  ],
  "total": 12
}
```

#### POST /api/bookings
Create a new booking.

**Request Body:**
```json
{
  "customer": "John Smith",
  "service": "HVAC Repair",
  "date": "2024-01-20",
  "time": "14:00",
  "phone": "+1234567890",
  "email": "john@example.com",
  "notes": "Customer reported heating issues",
  "estimatedValue": 300
}
```

#### PUT /api/bookings/[id]
Update an existing booking.

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

#### DELETE /api/bookings/[id]
Delete a booking.

### Onboarding

#### POST /api/complete-onboarding
Complete user onboarding process.

**Request Body:**
```json
{
  "businessName": "ACME Corp",
  "businessType": "HVAC",
  "contactName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "companySize": "1-10",
  "timezone": "America/New_York",
  "aiPersonality": "professional",
  "averageJobValue": 500,
  "businessHours": {
    "monday": { "open": "09:00", "close": "17:00", "closed": false },
    "tuesday": { "open": "09:00", "close": "17:00", "closed": false }
  },
  "services": ["HVAC Repair", "HVAC Installation", "Maintenance"],
  "specialInstructions": "Always ask about emergency services"
}
```

### AI Agent Management

#### POST /api/create-retell-agent
Create a new Retell AI agent.

**Request Body:**
```json
{
  "businessName": "ACME Corp",
  "businessType": "HVAC",
  "contactName": "John Doe",
  "phoneNumber": "+1234567890",
  "services": ["HVAC Repair", "HVAC Installation"],
  "businessHours": {
    "monday": { "open": "09:00", "close": "17:00", "closed": false }
  },
  "aiPersonality": "professional",
  "specialInstructions": "Always ask about emergency services"
}
```

**Response:**
```json
{
  "agentId": "agent_123",
  "status": "created",
  "message": "AI agent created successfully"
}
```

#### POST /api/purchase-phone-number
Configure phone number integration.

**Request Body:**
```json
{
  "businessName": "ACME Corp",
  "businessType": "HVAC",
  "areaCode": "555",
  "agentId": "agent_123"
}
```

### Subscription Management

#### POST /api/create-subscription
Create a new subscription.

**Request Body:**
```json
{
  "userId": "user_123",
  "plan": "pro",
  "paymentMethodId": "pm_123"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_123",
  "status": "active",
  "currentPeriodEnd": "2024-02-15T10:30:00Z"
}
```

### Notifications

#### GET /api/notifications
Get user notifications.

**Query Parameters:**
- `userId` (required): User ID
- `unread` (optional): Filter unread notifications (true/false)

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "call_completed",
      "title": "New Call Completed",
      "message": "Call from +1234567890 completed successfully",
      "read": false,
      "data": {
        "callId": "call_123",
        "duration": 45
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "unreadCount": 3
}
```

#### PUT /api/notifications/[id]/read
Mark notification as read.

#### DELETE /api/notifications/[id]
Delete a notification.

### Webhooks

#### POST /api/webhooks/retell
Retell AI webhook endpoint for call events.

**Headers:**
- `x-retell-signature`: Webhook signature for verification

**Request Body:**
```json
{
  "event_type": "call_ended",
  "call": {
    "call_id": "call_123",
    "phone_number": "+1234567890",
    "from_number": "+0987654321",
    "call_length": 45,
    "end_reason": "customer_hangup",
    "transcript": "Full call transcript...",
    "summary": "Customer inquiry about HVAC service"
  }
}
```

#### POST /api/webhooks/stripe
Stripe webhook endpoint for payment events.

**Headers:**
- `stripe-signature`: Stripe webhook signature

**Request Body:**
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_123",
      "customer": "cus_123",
      "status": "active"
    }
  }
}
```

### Admin Endpoints

#### GET /api/admin/clients
Get all clients (admin only).

**Response:**
```json
{
  "clients": [
    {
      "id": "user_123",
      "email": "john@example.com",
      "companyName": "ACME Corp",
      "businessType": "HVAC",
      "onboardingStatus": "completed",
      "subscriptionStatus": "active",
      "totalRevenue": 15000,
      "totalCalls": 45,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### Testing Endpoints

#### POST /api/send-test-email
Send a test email.

**Request Body:**
```json
{
  "type": "welcome",
  "to": "test@example.com",
  "data": {
    "businessName": "Test Business"
  }
}
```

#### GET /api/test-stripe
Test Stripe integration.

#### GET /api/test-retell
Test Retell AI integration.

#### POST /api/test-onboarding-flow
Test complete onboarding flow.

## SDK Examples

### JavaScript/TypeScript

```typescript
class CloudGreetAPI {
  private baseURL: string
  private sessionToken: string

  constructor(baseURL: string, sessionToken: string) {
    this.baseURL = baseURL
    this.sessionToken = sessionToken
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  }

  async getBusinessStats(userId: string) {
    return this.request(`/get-business-stats?userId=${userId}`)
  }

  async createBooking(booking: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking)
    })
  }

  async getCallLogs(userId: string, limit = 50, offset = 0) {
    return this.request(`/call-logs?userId=${userId}&limit=${limit}&offset=${offset}`)
  }
}

// Usage
const api = new CloudGreetAPI('https://cloudgreet.com/api', 'your-session-token')
const stats = await api.getBusinessStats('user-123')
```

### Python

```python
import requests
from typing import Dict, Any

class CloudGreetAPI:
    def __init__(self, base_url: str, session_token: str):
        self.base_url = base_url
        self.session_token = session_token
        self.headers = {
            'Authorization': f'Bearer {session_token}',
            'Content-Type': 'application/json'
        }

    def request(self, endpoint: str, method: str = 'GET', data: Dict[str, Any] = None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_business_stats(self, user_id: str):
        return self.request(f'/get-business-stats?userId={user_id}')

    def create_booking(self, booking: Dict[str, Any]):
        return self.request('/bookings', 'POST', booking)

    def get_call_logs(self, user_id: str, limit: int = 50, offset: int = 0):
        return self.request(f'/call-logs?userId={user_id}&limit={limit}&offset={offset}')

# Usage
api = CloudGreetAPI('https://cloudgreet.com/api', 'your-session-token')
stats = api.get_business_stats('user-123')
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `USER_NOT_FOUND` | User does not exist |
| `INVALID_TOKEN` | Invalid or expired token |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `VALIDATION_ERROR` | Request validation failed |
| `SUBSCRIPTION_REQUIRED` | Active subscription required |
| `AGENT_NOT_FOUND` | Retell AI agent not found |
| `PHONE_NOT_CONNECTED` | Phone number not connected |
| `ONBOARDING_INCOMPLETE` | Onboarding process not completed |

## Webhook Security

All webhooks include signature verification:

### Retell AI Webhooks
```javascript
const crypto = require('crypto')

function verifyRetellSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

### Stripe Webhooks
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

function verifyStripeSignature(payload, signature, secret) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    throw new Error('Invalid signature')
  }
}
```

## Support

For API support and questions:
- Email: api-support@cloudgreet.com
- Documentation: https://docs.cloudgreet.com
- Status Page: https://status.cloudgreet.com

