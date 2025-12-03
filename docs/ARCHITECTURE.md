# CloudGreet Architecture Documentation

## Overview

CloudGreet is a comprehensive AI-powered business communication platform that automates lead qualification, appointment scheduling, and customer engagement through voice and SMS channels. The system is built with a modern, scalable architecture designed for enterprise-grade performance and reliability.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (Next.js)     │◄──►│   (Middleware)  │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN           │    │   Load Balancer │    │   Database      │
│   (Vercel)      │    │   (Vercel)      │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   External      │
                                              │   Services      │
                                              │   (Telnyx,      │
                                              │    Retell AI)   │
                                              └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **UI Components**: Custom components with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis
- **Authentication**: JWT with Supabase
- **Validation**: Zod schemas
- **Logging**: Winston with structured logging

#### External Services
- **Voice/SMS**: Telnyx API
- **AI Agent**: Retell AI
- **Calendar**: Google Calendar API
- **Email**: Resend API
- **Monitoring**: Custom health checks + alerting

#### Infrastructure
- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Database**: Supabase (managed PostgreSQL)
- **Caching**: Redis (managed)
- **Monitoring**: Custom monitoring system
- **CI/CD**: GitHub Actions

## Core Components

### 1. Authentication & Authorization

#### JWT Token Management
```typescript
interface JWTPayload {
  sub: string;           // User ID
  business_id: string;   // Business ID for multi-tenancy
  role: 'admin' | 'user' | 'agent';
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

#### Multi-Tenant Architecture
- Each business operates in isolation
- Row-level security (RLS) in Supabase
- Business-specific data segregation
- Tenant-aware API endpoints

### 2. AI Agent System

#### Agent Configuration
```typescript
interface AIAgent {
  id: string;
  business_id: string;
  name: string;
  voice_settings: {
    voice_id: string;
    speed: number;
    pitch: number;
  };
  behavior_settings: {
    personality: string;
    conversation_style: string;
    escalation_triggers: string[];
  };
  working_hours: BusinessHours;
  is_active: boolean;
}
```

#### Conversation Flow
1. **Incoming Call**: Telnyx webhook triggers agent
2. **Agent Initialization**: Load business-specific configuration
3. **Conversation**: Retell AI handles voice interaction
4. **Lead Qualification**: AI determines lead quality and intent
5. **Appointment Scheduling**: AI books appointments based on availability
6. **Follow-up**: Automated SMS/email sequences

### 3. Database Schema

#### Core Tables
```sql
-- Users and Authentication
users (id, email, business_id, role, created_at, updated_at)
businesses (id, name, settings, created_at, updated_at)

-- AI Agents
ai_agents (id, business_id, name, config, is_active, created_at)
agent_conversations (id, agent_id, lead_id, transcript, outcome, created_at)

-- Lead Management
leads (id, business_id, phone, name, email, status, source, created_at)
lead_qualification (id, lead_id, score, criteria, notes, created_at)

-- Appointments
appointments (id, business_id, lead_id, scheduled_date, status, created_at)
appointment_reminders (id, appointment_id, sent_at, type, created_at)

-- Communications
calls (id, business_id, lead_id, duration, status, recording_url, created_at)
sms_messages (id, business_id, lead_id, content, status, sent_at, created_at)
emails (id, business_id, lead_id, subject, content, status, sent_at, created_at)
```

#### Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_leads_business_id ON leads(business_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
```

### 4. API Architecture

#### RESTful API Design
```
GET    /api/health                    # Health check
GET    /api/businesses                # List businesses
POST   /api/businesses                # Create business
GET    /api/businesses/{id}           # Get business
PUT    /api/businesses/{id}           # Update business

GET    /api/leads                     # List leads
POST   /api/leads                     # Create lead
GET    /api/leads/{id}                # Get lead
PUT    /api/leads/{id}                # Update lead

GET    /api/appointments              # List appointments
POST   /api/appointments              # Create appointment
GET    /api/appointments/{id}         # Get appointment
PUT    /api/appointments/{id}         # Update appointment
DELETE /api/appointments/{id}         # Cancel appointment

POST   /api/agent/start               # Start AI agent
POST   /api/agent/stop                # Stop AI agent
GET    /api/agent/status              # Get agent status
```

#### Webhook Endpoints
```
POST   /api/webrtc/webhook            # Telnyx voice webhook
POST   /api/sms/webhook               # Telnyx SMS webhook
POST   /api/retell/webhook            # Retell AI webhook
```

### 5. Security Architecture

#### Security Layers
1. **Network Security**: HTTPS, CORS, CSP headers
2. **Authentication**: JWT tokens with expiration
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: Zod schemas for all inputs
5. **SQL Injection Prevention**: Parameterized queries
6. **XSS Protection**: Input sanitization and CSP
7. **Rate Limiting**: Per-endpoint rate limits
8. **Secrets Management**: Environment variables with rotation

#### Security Headers
```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

### 6. Performance Optimization

#### Caching Strategy
- **API Response Caching**: Redis with 5-minute TTL
- **Database Query Caching**: Query result caching
- **Static Asset Caching**: CDN with long TTL
- **Component Memoization**: React.memo, useMemo, useCallback

#### Database Optimization
- **Connection Pooling**: Supabase connection management
- **Query Optimization**: Indexed queries, N+1 prevention
- **Pagination**: Cursor-based pagination for large datasets
- **Read Replicas**: Supabase read replicas for scaling

#### Frontend Optimization
- **Code Splitting**: Dynamic imports and lazy loading
- **Image Optimization**: Next.js Image component
- **Bundle Optimization**: Tree shaking and minification
- **Virtual Scrolling**: For large lists

### 7. Monitoring & Observability

#### Health Checks
- **Database Connectivity**: Connection and query performance
- **External APIs**: Telnyx, Retell AI, Google Calendar
- **System Resources**: Memory, CPU, disk space
- **Business Logic**: Critical functionality tests

#### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Log Aggregation**: Centralized log collection
- **Log Retention**: 30-day retention policy

#### Alerting
- **Error Rate Alerts**: >5% error rate threshold
- **Performance Alerts**: >2s response time threshold
- **Resource Alerts**: >80% memory/CPU usage
- **Business Alerts**: Failed appointments, agent downtime

### 8. Deployment Architecture

#### Environment Strategy
- **Development**: Local development with hot reload
- **Testing**: Automated testing environment
- **Staging**: Production-like environment for testing
- **Production**: Live environment with monitoring

#### CI/CD Pipeline
1. **Code Push**: GitHub webhook triggers pipeline
2. **Testing**: Unit, integration, and E2E tests
3. **Security Scan**: Dependency and code scanning
4. **Build**: TypeScript compilation and optimization
5. **Deploy**: Vercel deployment with zero downtime
6. **Health Check**: Post-deployment health verification

#### Rollback Strategy
- **Blue-Green Deployment**: Zero-downtime deployments
- **Feature Flags**: Gradual feature rollouts
- **Database Migrations**: Backward-compatible changes
- **Rollback Triggers**: Automatic rollback on health check failures

## Data Flow

### 1. Lead Qualification Flow
```
Incoming Call → Telnyx Webhook → Agent Initialization → 
Retell AI Conversation → Lead Scoring → Database Storage → 
Appointment Scheduling → Follow-up Sequence
```

### 2. Appointment Booking Flow
```
Lead Request → Availability Check → Calendar Integration → 
Appointment Creation → Confirmation → Reminder Scheduling → 
Follow-up Communications
```

### 3. Communication Flow
```
User Action → API Request → Authentication → Authorization → 
Business Logic → Database Update → External API Call → 
Response Processing → User Notification
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless API**: No server-side session storage
- **Database Scaling**: Supabase auto-scaling
- **CDN Distribution**: Global edge caching
- **Load Balancing**: Vercel automatic load balancing

### Vertical Scaling
- **Resource Monitoring**: CPU and memory usage tracking
- **Performance Profiling**: Identify bottlenecks
- **Query Optimization**: Database query performance
- **Caching Strategy**: Reduce database load

### Future Scaling
- **Microservices**: Break down monolithic API
- **Event Streaming**: Kafka for real-time events
- **Container Orchestration**: Kubernetes for complex deployments
- **Multi-Region**: Global deployment strategy

## Security Considerations

### Data Protection
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **PII Handling**: GDPR compliance
- **Data Retention**: Automated data cleanup

### Access Control
- **Multi-Factor Authentication**: Enhanced security
- **Role-Based Access**: Granular permissions
- **API Rate Limiting**: DDoS protection
- **Audit Logging**: Security event tracking

### Compliance
- **GDPR**: European data protection
- **TCPA**: SMS/voice compliance
- **SOC 2**: Security controls
- **PCI DSS**: Payment data security

## Disaster Recovery

### Backup Strategy
- **Database Backups**: Daily automated backups
- **Code Backups**: Git repository redundancy
- **Configuration Backups**: Environment variable backups
- **Recovery Testing**: Regular restore testing

### High Availability
- **Multi-Zone Deployment**: Vercel multi-region
- **Database Replication**: Supabase read replicas
- **Health Monitoring**: Continuous health checks
- **Automatic Failover**: Service redundancy

## Maintenance & Operations

### Monitoring
- **Application Performance**: Response times and error rates
- **Infrastructure Health**: Server and database metrics
- **Business Metrics**: Lead conversion and appointment rates
- **Security Events**: Authentication and authorization logs

### Maintenance Windows
- **Scheduled Maintenance**: Planned downtime windows
- **Hot Fixes**: Emergency deployments
- **Database Maintenance**: Index optimization and cleanup
- **Security Updates**: Regular security patches

### Documentation
- **API Documentation**: OpenAPI/Swagger specs
- **Runbooks**: Operational procedures
- **Architecture Decisions**: ADR documentation
- **Troubleshooting Guides**: Common issue resolution

## Future Enhancements

### Planned Features
- **Multi-Language Support**: Internationalization
- **Advanced Analytics**: Business intelligence dashboard
- **Mobile App**: Native mobile application
- **API Marketplace**: Third-party integrations

### Technical Improvements
- **GraphQL API**: More flexible data fetching
- **Real-time Updates**: WebSocket connections
- **Machine Learning**: Predictive analytics
- **Blockchain Integration**: Secure data verification

This architecture provides a solid foundation for CloudGreet's current needs while maintaining flexibility for future growth and enhancements.















