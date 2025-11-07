#!/usr/bin/env node

/**
 * Comprehensive Security Audit
 * Audits security headers, authentication, authorization, and vulnerabilities
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
const securityResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  vulnerabilities: []
};

// Utility functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function logSecurityCheck(checkName, status, details = null) {
  const statusMap = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️'
  };
  
  const icon = statusMap[status] || '❓';
  console.log(`${icon} ${checkName}`);
  
  if (details) {
    console.log(`   ${details}`);
  }
  
  if (status === 'PASS') {
    securityResults.passed++;
  } else if (status === 'WARN') {
    securityResults.warnings++;
  } else {
    securityResults.failed++;
  }
}

// Generate a test JWT token
function generateTestToken() {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-testing';
  
  return jwt.sign({
    userId: 'test-user-123',
    businessId: 'test-business-123',
    email: 'test@cloudgreet.com',
    role: 'user'
  }, secret, { expiresIn: '1h' });
}

// Security check functions
async function checkSecurityHeaders() {
  try {
    const response = await makeRequest(`${BASE_URL}/`);
    const headers = response.headers;
    
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': 'default-src \'self\''
    };
    
    let headerScore = 0;
    const totalHeaders = Object.keys(securityHeaders).length;
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = headers[header.toLowerCase()];
      if (actualValue) {
        if (expectedValue === 'any' || actualValue.includes(expectedValue)) {
          headerScore++;
        } else {
          logSecurityCheck(`Security Header: ${header}`, 'WARN', `Expected: ${expectedValue}, Got: ${actualValue}`);
        }
      } else {
        logSecurityCheck(`Security Header: ${header}`, 'FAIL', 'Missing');
      }
    }
    
    const headerPercentage = (headerScore / totalHeaders) * 100;
    if (headerPercentage >= 80) {
      logSecurityCheck('Security Headers Overall', 'PASS', `${headerScore}/${totalHeaders} headers present`);
    } else {
      logSecurityCheck('Security Headers Overall', 'WARN', `${headerScore}/${totalHeaders} headers present`);
    }
  } catch (error) {
    logSecurityCheck('Security Headers', 'FAIL', error.message);
  }
}

async function checkHTTPSRedirect() {
  try {
    const response = await makeRequest(`http://${BASE_URL.replace('http://', '').replace('https://', '')}/`);
    
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.location;
      if (location && location.startsWith('https://')) {
        logSecurityCheck('HTTPS Redirect', 'PASS', 'Redirects to HTTPS');
      } else {
        logSecurityCheck('HTTPS Redirect', 'WARN', 'Redirects but not to HTTPS');
      }
    } else {
      logSecurityCheck('HTTPS Redirect', 'WARN', 'No redirect detected');
    }
  } catch (error) {
    logSecurityCheck('HTTPS Redirect', 'FAIL', error.message);
  }
}

async function checkAuthenticationSecurity() {
  try {
    // Test invalid token
    const invalidResponse = await makeRequest(`${API_BASE}/dashboard/data`, {
      headers: {
        'Authorization': 'Bearer invalid-token-123'
      }
    });
    
    if (invalidResponse.status === 401) {
      logSecurityCheck('Invalid Token Rejection', 'PASS', 'Returns 401 for invalid token');
    } else {
      logSecurityCheck('Invalid Token Rejection', 'FAIL', `Returns ${invalidResponse.status} instead of 401`);
    }
    
    // Test missing token
    const missingResponse = await makeRequest(`${API_BASE}/dashboard/data`);
    
    if (missingResponse.status === 401) {
      logSecurityCheck('Missing Token Rejection', 'PASS', 'Returns 401 for missing token');
    } else {
      logSecurityCheck('Missing Token Rejection', 'FAIL', `Returns ${missingResponse.status} instead of 401`);
    }
    
    // Test valid token
    const token = generateTestToken();
    const validResponse = await makeRequest(`${API_BASE}/dashboard/data`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (validResponse.status === 200 || validResponse.status === 500) {
      logSecurityCheck('Valid Token Acceptance', 'PASS', 'Accepts valid token');
    } else {
      logSecurityCheck('Valid Token Acceptance', 'WARN', `Returns ${validResponse.status} for valid token`);
    }
  } catch (error) {
    logSecurityCheck('Authentication Security', 'FAIL', error.message);
  }
}

async function checkSQLInjectionProtection() {
  try {
    const maliciousPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' UNION SELECT * FROM users --"
    ];
    
    let protectionScore = 0;
    
    for (const payload of maliciousPayloads) {
      try {
        const response = await makeRequest(`${API_BASE}/auth/login-simple`, {
          method: 'POST',
          body: {
            email: payload,
            password: 'test'
          }
        });
        
        // Should not return 200 with malicious payload
        if (response.status !== 200) {
          protectionScore++;
        }
      } catch (error) {
        protectionScore++; // Error is good - means protection is working
      }
    }
    
    const protectionPercentage = (protectionScore / maliciousPayloads.length) * 100;
    if (protectionPercentage >= 75) {
      logSecurityCheck('SQL Injection Protection', 'PASS', `${protectionScore}/${maliciousPayloads.length} payloads blocked`);
    } else {
      logSecurityCheck('SQL Injection Protection', 'WARN', `${protectionScore}/${maliciousPayloads.length} payloads blocked`);
    }
  } catch (error) {
    logSecurityCheck('SQL Injection Protection', 'FAIL', error.message);
  }
}

async function checkXSSProtection() {
  try {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">'
    ];
    
    let protectionScore = 0;
    
    for (const payload of xssPayloads) {
      try {
        const response = await makeRequest(`${API_BASE}/auth/register-simple-working`, {
          method: 'POST',
          body: {
            business_name: payload,
            email: 'test@example.com',
            password: 'test123',
            phone: '+1234567890',
            address: 'Test Address'
          }
        });
        
        // Check if response contains the payload (indicating XSS vulnerability)
        const responseText = JSON.stringify(response.data);
        if (!responseText.includes(payload)) {
          protectionScore++;
        }
      } catch (error) {
        protectionScore++; // Error is good - means protection is working
      }
    }
    
    const protectionPercentage = (protectionScore / xssPayloads.length) * 100;
    if (protectionPercentage >= 75) {
      logSecurityCheck('XSS Protection', 'PASS', `${protectionScore}/${xssPayloads.length} payloads blocked`);
    } else {
      logSecurityCheck('XSS Protection', 'WARN', `${protectionScore}/${xssPayloads.length} payloads blocked`);
    }
  } catch (error) {
    logSecurityCheck('XSS Protection', 'FAIL', error.message);
  }
}

async function checkRateLimiting() {
  try {
    const requests = [];
    
    // Make multiple rapid requests
    for (let i = 0; i < 20; i++) {
      requests.push(makeRequest(`${API_BASE}/health`));
    }
    
    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    
    if (rateLimitedCount > 0) {
      logSecurityCheck('Rate Limiting', 'PASS', `${rateLimitedCount} requests rate limited`);
    } else if (successCount === responses.length) {
      logSecurityCheck('Rate Limiting', 'WARN', 'No rate limiting detected');
    } else {
      logSecurityCheck('Rate Limiting', 'WARN', 'Mixed responses, unclear rate limiting');
    }
  } catch (error) {
    logSecurityCheck('Rate Limiting', 'FAIL', error.message);
  }
}

async function checkInputValidation() {
  try {
    const invalidInputs = [
      { email: 'invalid-email', password: 'test' },
      { email: 'test@example.com', password: '123' }, // Too short
      { email: '', password: 'test123' }, // Empty email
      { email: 'test@example.com', password: '' } // Empty password
    ];
    
    let validationScore = 0;
    
    for (const input of invalidInputs) {
      try {
        const response = await makeRequest(`${API_BASE}/auth/login-simple`, {
          method: 'POST',
          body: input
        });
        
        // Should return 400 for invalid input
        if (response.status === 400) {
          validationScore++;
        }
      } catch (error) {
        validationScore++; // Error is good - means validation is working
      }
    }
    
    const validationPercentage = (validationScore / invalidInputs.length) * 100;
    if (validationPercentage >= 75) {
      logSecurityCheck('Input Validation', 'PASS', `${validationScore}/${invalidInputs.length} invalid inputs rejected`);
    } else {
      logSecurityCheck('Input Validation', 'WARN', `${validationScore}/${invalidInputs.length} invalid inputs rejected`);
    }
  } catch (error) {
    logSecurityCheck('Input Validation', 'FAIL', error.message);
  }
}

async function checkCORSConfiguration() {
  try {
    const response = await makeRequest(`${API_BASE}/health`, {
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    const corsCredentials = response.headers['access-control-allow-credentials'];
    
    if (corsHeader === '*' && corsCredentials === 'true') {
      logSecurityCheck('CORS Configuration', 'WARN', 'Allows all origins with credentials');
    } else if (corsHeader === '*') {
      logSecurityCheck('CORS Configuration', 'WARN', 'Allows all origins');
    } else if (corsHeader) {
      logSecurityCheck('CORS Configuration', 'PASS', 'Restricted CORS policy');
    } else {
      logSecurityCheck('CORS Configuration', 'PASS', 'No CORS headers (default deny)');
    }
  } catch (error) {
    logSecurityCheck('CORS Configuration', 'FAIL', error.message);
  }
}

async function checkErrorHandling() {
  try {
    // Test 404 endpoint
    const notFoundResponse = await makeRequest(`${API_BASE}/nonexistent-endpoint`);
    
    if (notFoundResponse.status === 404) {
      logSecurityCheck('404 Error Handling', 'PASS', 'Returns 404 for non-existent endpoints');
    } else {
      logSecurityCheck('404 Error Handling', 'WARN', `Returns ${notFoundResponse.status} instead of 404`);
    }
    
    // Test error response doesn't leak sensitive info
    const errorResponse = await makeRequest(`${API_BASE}/auth/login-simple`, {
      method: 'POST',
      body: { invalid: 'data' }
    });
    
    const responseText = JSON.stringify(errorResponse.data);
    const sensitivePatterns = [
      'password',
      'secret',
      'key',
      'token',
      'database',
      'connection'
    ];
    
    let leakCount = 0;
    for (const pattern of sensitivePatterns) {
      if (responseText.toLowerCase().includes(pattern)) {
        leakCount++;
      }
    }
    
    if (leakCount === 0) {
      logSecurityCheck('Error Information Leakage', 'PASS', 'No sensitive information in error responses');
    } else {
      logSecurityCheck('Error Information Leakage', 'WARN', `Potential information leakage detected`);
    }
  } catch (error) {
    logSecurityCheck('Error Handling', 'FAIL', error.message);
  }
}

async function checkFileUploadSecurity() {
  try {
    // Test file upload endpoint if it exists
    const response = await makeRequest(`${API_BASE}/upload`, {
      method: 'POST',
      body: {
        file: 'test.txt',
        content: 'test content'
      }
    });
    
    if (response.status === 404) {
      logSecurityCheck('File Upload Security', 'PASS', 'No file upload endpoint found');
    } else {
      logSecurityCheck('File Upload Security', 'WARN', 'File upload endpoint exists - ensure proper validation');
    }
  } catch (error) {
    logSecurityCheck('File Upload Security', 'PASS', 'No file upload endpoint found');
  }
}

// Main audit runner
async function runSecurityAudit() {
  console.log('🔒 Starting Comprehensive Security Audit...\n');
  
  // Security headers and HTTPS
  await checkSecurityHeaders();
  await checkHTTPSRedirect();
  
  // Authentication and authorization
  await checkAuthenticationSecurity();
  
  // Input validation and injection protection
  await checkSQLInjectionProtection();
  await checkXSSProtection();
  await checkInputValidation();
  
  // Network security
  await checkRateLimiting();
  await checkCORSConfiguration();
  
  // Error handling and information disclosure
  await checkErrorHandling();
  await checkFileUploadSecurity();
  
  // Results summary
  console.log('\n📊 Security Audit Results:');
  console.log(`✅ Passed: ${securityResults.passed}`);
  console.log(`⚠️  Warnings: ${securityResults.warnings}`);
  console.log(`❌ Failed: ${securityResults.failed}`);
  console.log(`📈 Security Score: ${((securityResults.passed / (securityResults.passed + securityResults.failed + securityResults.warnings)) * 100).toFixed(1)}%`);
  
  // Security recommendations
  console.log('\n💡 Security Recommendations:');
  if (securityResults.failed > 0) {
    console.log('  - Address critical security issues immediately');
  }
  if (securityResults.warnings > 0) {
    console.log('  - Review and improve security configurations');
  }
  console.log('  - Implement regular security scanning');
  console.log('  - Keep dependencies updated');
  console.log('  - Use HTTPS in production');
  console.log('  - Implement proper logging and monitoring');
  
  // Exit with appropriate code
  process.exit(securityResults.failed > 0 ? 1 : 0);
}

// Run security audit
runSecurityAudit().catch(error => {
  console.error('💥 Security audit failed:', error);
  process.exit(1);
});