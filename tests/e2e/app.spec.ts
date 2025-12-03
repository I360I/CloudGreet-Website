/**
 * End-to-End Tests for CloudGreet Application
 * Tests complete user journeys using Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@cloudgreet.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_BUSINESS_NAME = 'Test Business E2E';

test.describe('CloudGreet E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(BASE_URL);
  });

  test.describe('Authentication Flow', () => {
    test('should register new user and business', async () => {
      // Navigate to registration page
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*\/auth\/register/);

      // Fill registration form
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
      await page.fill('input[name="businessName"]', TEST_BUSINESS_NAME);
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should login existing user', async () => {
      // Navigate to login page
      await page.click('text=Sign In');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      // Fill login form
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should handle invalid login credentials', async () => {
      await page.click('text=Sign In');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      // Fill with invalid credentials
      await page.fill('input[name="email"]', 'invalid@test.com');
      await page.fill('input[name="password"]', 'wrongpassword');

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Invalid credentials');
    });

    test('should logout user', async () => {
      // Login first
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Click logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Logout');

      // Should redirect to home page
      await expect(page).toHaveURL(/.*\/$/);
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async () => {
      // Login before each test
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should display dashboard overview', async () => {
      // Check dashboard elements
      await expect(page.locator('h1')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-leads"]')).toBeVisible();
      await expect(page.locator('[data-testid="upcoming-appointments"]')).toBeVisible();
    });

    test('should navigate to different sections', async () => {
      // Navigate to leads
      await page.click('text=Leads');
      await expect(page).toHaveURL(/.*\/leads/);
      await expect(page.locator('h1')).toContainText('Leads');

      // Navigate to appointments
      await page.click('text=Appointments');
      await expect(page).toHaveURL(/.*\/appointments/);
      await expect(page.locator('h1')).toContainText('Appointments');

      // Navigate to settings
      await page.click('text=Settings');
      await expect(page).toHaveURL(/.*\/settings/);
      await expect(page.locator('h1')).toContainText('Settings');
    });
  });

  test.describe('Lead Management', () => {
    test.beforeEach(async () => {
      // Login and navigate to leads
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.click('text=Leads');
      await expect(page).toHaveURL(/.*\/leads/);
    });

    test('should create new lead', async () => {
      // Click create lead button
      await page.click('[data-testid="create-lead-button"]');

      // Fill lead form
      await page.fill('input[name="name"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1234567890');
      await page.selectOption('select[name="source"]', 'web');
      await page.fill('textarea[name="notes"]', 'Interested in premium package');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Lead created successfully');

      // Should appear in leads list
      await expect(page.locator('[data-testid="lead-item"]')).toContainText('John Doe');
    });

    test('should edit existing lead', async () => {
      // Create a lead first
      await page.click('[data-testid="create-lead-button"]');
      await page.fill('input[name="name"]', 'Jane Smith');
      await page.fill('input[name="email"]', 'jane@example.com');
      await page.fill('input[name="phone"]', '+0987654321');
      await page.selectOption('select[name="source"]', 'call');
      await page.click('button[type="submit"]');

      // Wait for lead to appear
      await expect(page.locator('[data-testid="lead-item"]')).toContainText('Jane Smith');

      // Click edit button
      await page.click('[data-testid="edit-lead-button"]');

      // Update lead information
      await page.fill('input[name="name"]', 'Jane Johnson');
      await page.fill('input[name="email"]', 'jane.johnson@example.com');
      await page.selectOption('select[name="status"]', 'qualified');

      // Submit changes
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('[data-testid="lead-item"]')).toContainText('Jane Johnson');
    });

    test('should filter leads by status', async () => {
      // Create leads with different statuses
      await page.click('[data-testid="create-lead-button"]');
      await page.fill('input[name="name"]', 'Qualified Lead');
      await page.fill('input[name="email"]', 'qualified@example.com');
      await page.fill('input[name="phone"]', '+1111111111');
      await page.selectOption('select[name="status"]', 'qualified');
      await page.click('button[type="submit"]');

      await page.click('[data-testid="create-lead-button"]');
      await page.fill('input[name="name"]', 'New Lead');
      await page.fill('input[name="email"]', 'new@example.com');
      await page.fill('input[name="phone"]', '+2222222222');
      await page.selectOption('select[name="status"]', 'new');
      await page.click('button[type="submit"]');

      // Filter by qualified status
      await page.selectOption('select[name="status-filter"]', 'qualified');

      // Should only show qualified leads
      await expect(page.locator('[data-testid="lead-item"]')).toContainText('Qualified Lead');
      await expect(page.locator('[data-testid="lead-item"]')).not.toContainText('New Lead');
    });

    test('should search leads by name or email', async () => {
      // Create test leads
      await page.click('[data-testid="create-lead-button"]');
      await page.fill('input[name="name"]', 'Search Test Lead');
      await page.fill('input[name="email"]', 'search@example.com');
      await page.fill('input[name="phone"]', '+3333333333');
      await page.click('button[type="submit"]');

      // Search for lead
      await page.fill('input[name="search"]', 'Search Test');

      // Should show matching lead
      await expect(page.locator('[data-testid="lead-item"]')).toContainText('Search Test Lead');
    });
  });

  test.describe('Appointment Management', () => {
    test.beforeEach(async () => {
      // Login and navigate to appointments
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.click('text=Appointments');
      await expect(page).toHaveURL(/.*\/appointments/);
    });

    test('should create new appointment', async () => {
      // Click create appointment button
      await page.click('[data-testid="create-appointment-button"]');

      // Fill appointment form
      await page.fill('input[name="leadName"]', 'John Doe');
      await page.fill('input[name="leadEmail"]', 'john@example.com');
      await page.fill('input[name="leadPhone"]', '+1234567890');
      await page.fill('input[name="scheduledDate"]', '2024-02-01');
      await page.fill('input[name="scheduledTime"]', '14:00');
      await page.selectOption('select[name="duration"]', '30');
      await page.selectOption('select[name="type"]', 'consultation');
      await page.fill('textarea[name="notes"]', 'Initial consultation call');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Appointment created successfully');

      // Should appear in appointments list
      await expect(page.locator('[data-testid="appointment-item"]')).toContainText('John Doe');
    });

    test('should edit existing appointment', async () => {
      // Create an appointment first
      await page.click('[data-testid="create-appointment-button"]');
      await page.fill('input[name="leadName"]', 'Jane Smith');
      await page.fill('input[name="leadEmail"]', 'jane@example.com');
      await page.fill('input[name="leadPhone"]', '+0987654321');
      await page.fill('input[name="scheduledDate"]', '2024-02-02');
      await page.fill('input[name="scheduledTime"]', '15:00');
      await page.selectOption('select[name="duration"]', '60');
      await page.selectOption('select[name="type"]', 'demo');
      await page.click('button[type="submit"]');

      // Wait for appointment to appear
      await expect(page.locator('[data-testid="appointment-item"]')).toContainText('Jane Smith');

      // Click edit button
      await page.click('[data-testid="edit-appointment-button"]');

      // Update appointment
      await page.fill('input[name="scheduledDate"]', '2024-02-03');
      await page.fill('input[name="scheduledTime"]', '16:00');
      await page.selectOption('select[name="status"]', 'confirmed');

      // Submit changes
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    });

    test('should cancel appointment', async () => {
      // Create an appointment first
      await page.click('[data-testid="create-appointment-button"]');
      await page.fill('input[name="leadName"]', 'Cancel Test');
      await page.fill('input[name="leadEmail"]', 'cancel@example.com');
      await page.fill('input[name="leadPhone"]', '+4444444444');
      await page.fill('input[name="scheduledDate"]', '2024-02-04');
      await page.fill('input[name="scheduledTime"]', '17:00');
      await page.click('button[type="submit"]');

      // Wait for appointment to appear
      await expect(page.locator('[data-testid="appointment-item"]')).toContainText('Cancel Test');

      // Click cancel button
      await page.click('[data-testid="cancel-appointment-button"]');

      // Confirm cancellation
      await page.click('text=Yes, Cancel Appointment');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Appointment cancelled');
    });

    test('should send appointment reminder', async () => {
      // Create an appointment first
      await page.click('[data-testid="create-appointment-button"]');
      await page.fill('input[name="leadName"]', 'Reminder Test');
      await page.fill('input[name="leadEmail"]', 'reminder@example.com');
      await page.fill('input[name="leadPhone"]', '+5555555555');
      await page.fill('input[name="scheduledDate"]', '2024-02-05');
      await page.fill('input[name="scheduledTime"]', '18:00');
      await page.click('button[type="submit"]');

      // Wait for appointment to appear
      await expect(page.locator('[data-testid="appointment-item"]')).toContainText('Reminder Test');

      // Click send reminder button
      await page.click('[data-testid="send-reminder-button"]');

      // Select reminder method
      await page.selectOption('select[name="method"]', 'sms');
      await page.fill('textarea[name="message"]', 'Reminder: You have an appointment tomorrow at 6 PM');

      // Send reminder
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Reminder sent');
    });
  });

  test.describe('AI Agent Management', () => {
    test.beforeEach(async () => {
      // Login and navigate to agents
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.click('text=AI Agents');
      await expect(page).toHaveURL(/.*\/agents/);
    });

    test('should create new AI agent', async () => {
      // Click create agent button
      await page.click('[data-testid="create-agent-button"]');

      // Fill agent form
      await page.fill('input[name="name"]', 'Test Sales Agent');
      await page.selectOption('select[name="voiceId"]', 'voice_123');
      await page.fill('input[name="speed"]', '1.0');
      await page.fill('input[name="pitch"]', '1.0');
      await page.selectOption('select[name="personality"]', 'professional');
      await page.selectOption('select[name="conversationStyle"]', 'friendly');

      // Set working hours
      await page.check('input[name="monday"]');
      await page.fill('input[name="mondayOpen"]', '09:00');
      await page.fill('input[name="mondayClose"]', '17:00');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Agent created successfully');

      // Should appear in agents list
      await expect(page.locator('[data-testid="agent-item"]')).toContainText('Test Sales Agent');
    });

    test('should start and stop AI agent', async () => {
      // Create an agent first
      await page.click('[data-testid="create-agent-button"]');
      await page.fill('input[name="name"]', 'Start Stop Test Agent');
      await page.selectOption('select[name="voiceId"]', 'voice_123');
      await page.click('button[type="submit"]');

      // Wait for agent to appear
      await expect(page.locator('[data-testid="agent-item"]')).toContainText('Start Stop Test Agent');

      // Start agent
      await page.click('[data-testid="start-agent-button"]');
      await expect(page.locator('.success-message')).toContainText('Agent started');

      // Check agent status
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('Active');

      // Stop agent
      await page.click('[data-testid="stop-agent-button"]');
      await expect(page.locator('.success-message')).toContainText('Agent stopped');

      // Check agent status
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('Inactive');
    });

    test('should edit AI agent configuration', async () => {
      // Create an agent first
      await page.click('[data-testid="create-agent-button"]');
      await page.fill('input[name="name"]', 'Edit Test Agent');
      await page.selectOption('select[name="voiceId"]', 'voice_123');
      await page.click('button[type="submit"]');

      // Wait for agent to appear
      await expect(page.locator('[data-testid="agent-item"]')).toContainText('Edit Test Agent');

      // Click edit button
      await page.click('[data-testid="edit-agent-button"]');

      // Update agent configuration
      await page.fill('input[name="name"]', 'Updated Agent Name');
      await page.fill('input[name="speed"]', '1.2');
      await page.selectOption('select[name="personality"]', 'casual');

      // Submit changes
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]')).toContainText('Updated Agent Name');
    });
  });

  test.describe('Settings and Configuration', () => {
    test.beforeEach(async () => {
      // Login and navigate to settings
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.click('text=Settings');
      await expect(page).toHaveURL(/.*\/settings/);
    });

    test('should update business settings', async () => {
      // Navigate to business settings tab
      await page.click('[data-testid="business-settings-tab"]');

      // Update business information
      await page.fill('input[name="businessName"]', 'Updated Business Name');
      await page.selectOption('select[name="timezone"]', 'America/Los_Angeles');

      // Update business hours
      await page.check('input[name="monday"]');
      await page.fill('input[name="mondayOpen"]', '08:00');
      await page.fill('input[name="mondayClose"]', '18:00');

      // Save changes
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Settings updated successfully');
    });

    test('should update user profile', async () => {
      // Navigate to profile tab
      await page.click('[data-testid="profile-tab"]');

      // Update profile information
      await page.fill('input[name="firstName"]', 'Updated');
      await page.fill('input[name="lastName"]', 'Name');
      await page.fill('input[name="email"]', 'updated@test.com');

      // Save changes
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Profile updated successfully');
    });

    test('should change password', async () => {
      // Navigate to security tab
      await page.click('[data-testid="security-tab"]');

      // Change password
      await page.fill('input[name="currentPassword"]', TEST_PASSWORD);
      await page.fill('input[name="newPassword"]', 'NewPassword123!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Password changed successfully');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Login
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      // Should show mobile navigation
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Should be able to navigate
      await page.click('[data-testid="mobile-menu"]');
      await page.click('text=Leads');
      await expect(page).toHaveURL(/.*\/leads/);
    });

    test('should work on tablet devices', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Login
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      // Should show responsive layout
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      // Try to login
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Network error');
    });

    test('should handle validation errors', async () => {
      // Try to create lead with invalid data
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.click('text=Leads');
      await page.click('[data-testid="create-lead-button"]');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('.field-error')).toBeVisible();
      await expect(page.locator('.field-error')).toContainText('Required');
    });
  });
});















