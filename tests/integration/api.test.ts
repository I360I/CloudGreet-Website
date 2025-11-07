/**
 * Integration Tests for API Endpoints
 * Tests complete API workflows including authentication, data flow, and external integrations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestFramework } from '../../lib/testing/test-framework';
import { JWTManager } from '@/lib/jwt-manager';

describe('API Integration Tests', () => {
  let jwtManager: JWTManager;
  let authToken: string;
  let testBusiness: any;
  let testUser: any;

  beforeAll(async () => {
    // Initialize test environment
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    jwtManager = new JWTManager();

    // Create test business
    testBusiness = await TestFramework.createTestData('businesses', {
      id: 'business_test_integration',
      name: 'Test Business Integration',
      settings: {
        timezone: 'America/New_York',
        business_hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
        },
      },
      created_at: new Date().toISOString(),
    });

    // Create test user
    testUser = await TestFramework.createTestData('users', {
      id: 'user_test_integration',
      email: 'test@integration.com',
      business_id: testBusiness.id,
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    // Generate auth token
    authToken = JWTManager.createUserToken(
      testUser.id,
      testBusiness.id,
      'test@example.com'
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await TestFramework.clearTestData('appointments');
    await TestFramework.clearTestData('leads');
    await TestFramework.clearTestData('ai_agents');
    await TestFramework.clearTestData('users');
    await TestFramework.clearTestData('businesses');
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await TestFramework.testApiEndpoint('GET', '/api/health');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.overall).toBe('healthy');
    });

    it('should return detailed health information', async () => {
      const response = await TestFramework.testApiEndpoint('GET', '/api/health?detailed=true');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.checks).toBeDefined();
      expect(Array.isArray(response.data.data.checks)).toBe(true);
    });
  });

  describe('Authentication Flow', () => {
    it('should register new user', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/auth/register', {
        body: {
          email: 'newuser@test.com',
          password: 'password123',
          business_name: 'New Test Business',
          first_name: 'New',
          last_name: 'User',
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.token).toBeDefined();
      expect(response.data.data.user.email).toBe('newuser@test.com');
    });

    it('should login existing user', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/auth/login', {
        body: {
          email: testUser.email,
          password: 'password123',
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.token).toBeDefined();
      expect(response.data.data.user.id).toBe(testUser.id);
    });

    it('should reject invalid credentials', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/auth/login', {
        body: {
          email: 'invalid@test.com',
          password: 'wrongpassword',
        },
        expectedStatus: 401,
      });

      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('Invalid credentials');
    });
  });

  describe('Business Management', () => {
    it('should list businesses for authenticated user', async () => {
      const response = await TestFramework.testApiEndpoint('GET', '/api/businesses', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.businesses).toBeDefined();
      expect(Array.isArray(response.data.data.businesses)).toBe(true);
    });

    it('should create new business', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/businesses', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          name: 'New Test Business',
          settings: {
            timezone: 'America/Los_Angeles',
            business_hours: {
              monday: { open: '08:00', close: '18:00' },
            },
          },
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe('New Test Business');
    });

    it('should update existing business', async () => {
      const response = await TestFramework.testApiEndpoint('PUT', `/api/businesses/${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          name: 'Updated Business Name',
          settings: {
            timezone: 'America/Chicago',
          },
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe('Updated Business Name');
    });
  });

  describe('Lead Management', () => {
    let testLead: any = null;

    it('should create new lead', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/leads', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          business_id: testBusiness.id,
          phone: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          source: 'web',
          notes: 'Interested in premium package',
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.phone).toBe('+1234567890');
      expect(response.data.data.name).toBe('John Doe');
      
      testLead = response.data.data;
    });

    it('should list leads for business', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/leads?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.leads).toBeDefined();
      expect(Array.isArray(response.data.data.leads)).toBe(true);
      expect(response.data.data.leads.length).toBeGreaterThan(0);
    });

    it('should update lead', async () => {
      if (!testLead) {
        // Create lead first if not exists
        const createResponse = await TestFramework.testApiEndpoint('POST', '/api/leads', {
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: {
            business_id: testBusiness.id,
            phone: '+1234567890',
            name: 'John Doe',
            email: 'john@example.com',
            source: 'web',
          },
          expectedStatus: 201,
        });
        testLead = createResponse.data.data;
      }
      const response = await TestFramework.testApiEndpoint('PUT', `/api/leads/${testLead.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          name: 'John Smith',
          email: 'johnsmith@example.com',
          status: 'qualified',
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe('John Smith');
      expect(response.data.data.status).toBe('qualified');
    });

    it('should qualify lead with AI scoring', async () => {
      if (!testLead) {
        // Create lead first if not exists
        const createResponse = await TestFramework.testApiEndpoint('POST', '/api/leads', {
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: {
            business_id: testBusiness.id,
            phone: '+1234567890',
            name: 'John Doe',
            email: 'john@example.com',
            source: 'web',
          },
          expectedStatus: 201,
        });
        testLead = createResponse.data.data;
      }
      const response = await TestFramework.testApiEndpoint('POST', `/api/leads/${testLead.id}/qualify`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          criteria: {
            budget: 'high',
            timeline: 'immediate',
            decision_maker: true,
          },
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.qualification_score).toBeDefined();
      expect(typeof response.data.data.qualification_score).toBe('number');
    });
  });

  describe('Appointment Management', () => {
    let testAppointment: any;
    let testLeadForAppointment: any = null;

    beforeAll(async () => {
      // Ensure we have a test lead for appointments
      const createResponse = await TestFramework.testApiEndpoint('POST', '/api/leads', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: {
          business_id: testBusiness.id,
          phone: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          source: 'web',
        },
        expectedStatus: 201,
      });
      testLeadForAppointment = createResponse.data.data;
    });

    it('should create new appointment', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/appointments', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          business_id: testBusiness.id,
          lead_id: testLeadForAppointment?.id || 'test-lead-id',
          scheduled_date: '2024-02-01T14:00:00Z',
          duration: 30,
          type: 'consultation',
          notes: 'Initial consultation call',
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.scheduled_date).toBe('2024-02-01T14:00:00Z');
      expect(response.data.data.duration).toBe(30);
      
      testAppointment = response.data.data;
    });

    it('should list appointments for business', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/appointments?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.appointments).toBeDefined();
      expect(Array.isArray(response.data.data.appointments)).toBe(true);
      expect(response.data.data.appointments.length).toBeGreaterThan(0);
    });

    it('should update appointment', async () => {
      const response = await TestFramework.testApiEndpoint('PUT', `/api/appointments/${testAppointment.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          scheduled_date: '2024-02-02T15:00:00Z',
          status: 'confirmed',
          notes: 'Updated appointment time',
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.scheduled_date).toBe('2024-02-02T15:00:00Z');
      expect(response.data.data.status).toBe('confirmed');
    });

    it('should send appointment reminder', async () => {
      const response = await TestFramework.testApiEndpoint('POST', `/api/appointments/${testAppointment.id}/remind`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          method: 'sms',
          message: 'Reminder: You have an appointment tomorrow at 3 PM',
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('reminder sent');
    });

    it('should cancel appointment', async () => {
      const response = await TestFramework.testApiEndpoint('DELETE', `/api/appointments/${testAppointment.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('cancelled');
    });
  });

  describe('AI Agent Management', () => {
    let testAgent: any;

    it('should create AI agent', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/agents', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          business_id: testBusiness.id,
          name: 'Test Sales Agent',
          voice_settings: {
            voice_id: 'voice_123',
            speed: 1.0,
            pitch: 1.0,
          },
          behavior_settings: {
            personality: 'professional',
            conversation_style: 'friendly',
            escalation_triggers: ['angry', 'confused'],
          },
          working_hours: {
            monday: { open: '09:00', close: '17:00' },
          },
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe('Test Sales Agent');
      expect(response.data.data.business_id).toBe(testBusiness.id);
      
      testAgent = response.data.data;
    });

    it('should list AI agents for business', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/agents?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.agents).toBeDefined();
      expect(Array.isArray(response.data.data.agents)).toBe(true);
      expect(response.data.data.agents.length).toBeGreaterThan(0);
    });

    it('should start AI agent', async () => {
      const response = await TestFramework.testApiEndpoint('POST', `/api/agents/${testAgent.id}/start`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('started');
    });

    it('should get agent status', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/agents/${testAgent.id}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBeDefined();
      expect(['active', 'inactive', 'starting', 'stopping']).toContain(response.data.data.status);
    });

    it('should stop AI agent', async () => {
      const response = await TestFramework.testApiEndpoint('POST', `/api/agents/${testAgent.id}/stop`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('stopped');
    });
  });

  describe('Communication Management', () => {
    let testLeadForCommunication: any = null;

    beforeAll(async () => {
      // Ensure we have a test lead for communication
      const createResponse = await TestFramework.testApiEndpoint('POST', '/api/leads', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: {
          business_id: testBusiness.id,
          phone: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          source: 'web',
        },
        expectedStatus: 201,
      });
      testLeadForCommunication = createResponse.data.data;
    });

    it('should send SMS message', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/sms', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          business_id: testBusiness.id,
          lead_id: testLeadForCommunication?.id || 'test-lead-id',
          phone: '+1234567890',
          message: 'Thank you for your interest! We\'ll call you soon.',
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('sent');
    });

    it('should send email', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/emails', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          business_id: testBusiness.id,
          lead_id: testLeadForCommunication?.id || 'test-lead-id',
          to: 'john@example.com',
          subject: 'Thank you for your interest',
          content: 'Thank you for your interest in our services...',
        },
        expectedStatus: 201,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('sent');
    });

    it('should list SMS messages', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/sms?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.sms_messages).toBeDefined();
      expect(Array.isArray(response.data.data.sms_messages)).toBe(true);
    });

    it('should list emails', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/emails?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.emails).toBeDefined();
      expect(Array.isArray(response.data.data.emails)).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('should get business analytics overview', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/analytics/overview?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.leads).toBeDefined();
      expect(response.data.data.appointments).toBeDefined();
      expect(response.data.data.calls).toBeDefined();
      expect(response.data.data.revenue).toBeDefined();
    });

    it('should get lead scoring analytics', async () => {
      const response = await TestFramework.testApiEndpoint('GET', `/api/analytics/leads/scored?business_id=${testBusiness.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 200,
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.leads).toBeDefined();
      expect(Array.isArray(response.data.data.leads)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await TestFramework.testApiEndpoint('GET', '/api/businesses', {
        expectedStatus: 401,
      });

      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('Authorization required');
    });

    it('should handle invalid business ID', async () => {
      const response = await TestFramework.testApiEndpoint('GET', '/api/leads?business_id=invalid_id', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        expectedStatus: 400,
      });

      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('Invalid business ID');
    });

    it('should handle validation errors', async () => {
      const response = await TestFramework.testApiEndpoint('POST', '/api/leads', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: {
          // Missing required fields
          business_id: testBusiness.id,
        },
        expectedStatus: 422,
      });

      expect(response.data.success).toBe(false);
      expect(response.data.code).toBe('VALIDATION_ERROR');
      expect(response.data.details).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        TestFramework.testApiEndpoint('GET', '/api/health')
      );

      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Should have some rate limited requests
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent API requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        TestFramework.testApiEndpoint('GET', '/api/health')
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      
      expect(successful).toBe(20);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large data sets efficiently', async () => {
      // Create multiple test leads
      const leadPromises = Array(50).fill(null).map((_, index) =>
        TestFramework.testApiEndpoint('POST', '/api/leads', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: {
            business_id: testBusiness.id,
            phone: `+123456789${index.toString().padStart(2, '0')}`,
            name: `Test Lead ${index}`,
            email: `test${index}@example.com`,
            source: 'web',
          },
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(leadPromises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
      
      expect(successful).toBe(50);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});










