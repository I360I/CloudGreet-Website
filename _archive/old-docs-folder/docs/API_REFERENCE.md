# API Reference

## Authentication

All API endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## GET /api/dashboard/roi-metrics

**Description**: Get ROI metrics and analytics for a business

**Auth**: Bearer token (JWT)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalCalls": 150,
    "answeredCalls": 142,
    "missedCalls": 8,
    "appointmentsBooked": 45,
    "appointmentsCompleted": 38,
    "totalRevenue": 22500,
    "totalFees": 3200,
    "netROI": 19300,
    "roiPercentage": 85.3,
    "closeRate": 84.4,
    "conversionRate": 31.7
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Errors**:
- 401: Unauthorized
- 429: Rate limited
- 500: Server error

## GET /api/analytics/call-analytics

**Description**: Get detailed call analytics including heatmaps and trends

**Auth**: Bearer token

**Query Parameters**:
- `timeframe`: `7d` | `30d` | `90d` (default: `30d`)
- `businessId`: Business identifier

**Response**:
```json
{
  "success": true,
  "data": {
    "callVolumeHeatmap": [
      {
        "hour": 9,
        "day": "Monday",
        "calls": 12
      }
    ],
    "callDurationTrend": [
      {
        "date": "2024-01-15",
        "avgDuration": 180
      }
    ],
    "conversionFunnel": [
      {
        "step": "Calls Received",
        "count": 150,
        "percentage": 100
      },
      {
        "step": "Calls Answered",
        "count": 142,
        "percentage": 94.7
      },
      {
        "step": "Appointments Booked",
        "count": 45,
        "percentage": 31.7
      }
    ],
    "sentimentAnalysis": {
      "positive": 65,
      "neutral": 25,
      "negative": 10
    },
    "totalCalls": 150,
    "avgCallDuration": 180,
    "conversionRate": 31.7
  }
}
```

## GET /api/analytics/ai-insights

**Description**: Get AI-generated insights and recommendations

**Auth**: Bearer token

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "insight_1",
      "type": "peak_time",
      "title": "Peak Call Hours Identified",
      "description": "Most calls come in between 9-11 AM and 2-4 PM",
      "impact": "high",
      "actionable": true,
      "recommendation": "Consider increasing staff during these hours",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## GET /api/calls/recording

**Description**: Get call recording URL and transcript

**Auth**: Bearer token

**Query Parameters**:
- `callId`: Call identifier
- `businessId`: Business identifier

**Response**:
```json
{
  "success": true,
  "data": {
    "callId": "call_123",
    "recordingUrl": "https://retell.ai/recordings/call_123.mp3",
    "transcript": "AI: Hello! Customer: What are your prices?",
    "duration": 180,
    "sentiment": "positive",
    "summary": "Customer inquired about pricing for HVAC services"
  }
}
```

## GET /api/calls/quality-metrics

**Description**: Get call quality statistics and metrics

**Auth**: Bearer token

**Response**:
```json
{
  "success": true,
  "data": {
    "avgCallDuration": 180,
    "avgResponseTime": 2.5,
    "audioQuality": 4.8,
    "dropRate": 0.05,
    "customerSatisfaction": 4.6,
    "totalCalls": 150,
    "successfulCalls": 142
  }
}
```

## GET /api/leads/scored

**Description**: Get scored leads with priority levels

**Auth**: Bearer token

**Query Parameters**:
- `limit`: Number of leads to return (default: 50)
- `status`: Filter by lead status
- `minScore`: Minimum lead score

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "lead_123",
      "name": "John Smith",
      "phone": "+1234567890",
      "email": "john@example.com",
      "company": "Smith HVAC",
      "source": "website",
      "status": "new",
      "score": 85,
      "priority": "high",
      "notes": "Interested in emergency services",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## POST /api/telnyx/initiate-call

**Description**: Initiate a phone call through Telnyx

**Auth**: Bearer token

**Request Body**:
```json
{
  "phoneNumber": "+1234567890",
  "businessId": "business_123",
  "businessInfo": {
    "name": "CloudGreet",
    "type": "AI Receptionist"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "callId": "call_123",
    "status": "initiated",
    "message": "Call initiated successfully"
  }
}
```

## POST /api/retell/webhook

**Description**: Webhook endpoint for Retell AI call events

**Auth**: Webhook signature verification

**Headers**:
- `X-Retell-Signature`: HMAC-SHA256 signature

**Request Body**:
```json
{
  "call_id": "call_123",
  "agent_id": "agent_456",
  "event": "call_ended",
  "transcript": "AI: Hello! Customer: What are your prices?",
  "recording_url": "https://retell.ai/recordings/call_123.mp3",
  "sentiment": "positive",
  "duration": 180,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response**:
```json
{
  "received": true
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": {},
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Common HTTP Status Codes**:
- 200: Success
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error

## Rate Limiting

API endpoints are rate limited per IP address:
- Authentication endpoints: 5 requests per 15 minutes
- General API endpoints: 100 requests per 15 minutes
- Webhook endpoints: 1000 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```