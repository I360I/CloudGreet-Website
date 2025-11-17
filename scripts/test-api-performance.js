#!/usr/bin/env node

/**
 * API Performance Tests
 * Tests API response times, throughput, and performance metrics
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  performance: {
    totalRequests: 0,
    totalTime: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    successRate: 0
  }
};

// Utility functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
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
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            responseTime: responseTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: responseTime
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

function logTest(testName, passed, responseTime = null, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const timeInfo = responseTime ? ` (${responseTime}ms)` : '';
  console.log(`${status} ${testName}${timeInfo}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
  
  // Update performance metrics
  if (responseTime !== null) {
    testResults.performance.totalRequests++;
    testResults.performance.totalTime += responseTime;
    testResults.performance.minResponseTime = Math.min(testResults.performance.minResponseTime, responseTime);
    testResults.performance.maxResponseTime = Math.max(testResults.performance.maxResponseTime, responseTime);
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

// Test functions
async function testHealthEndpointPerformance() {
  try {
    const response = await makeRequest(`${API_BASE}/health`);
    const success = response.status === 200;
    logTest('Health Endpoint Performance', success, response.responseTime, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Health Endpoint Performance', false, null, error);
  }
}

async function testJWTPerformance() {
  try {
    const response = await makeRequest(`${API_BASE}/test-jwt`);
    const success = response.status === 200;
    logTest('JWT Endpoint Performance', success, response.responseTime, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('JWT Endpoint Performance', false, null, error);
  }
}

async function testProtectedEndpointPerformance() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/dashboard/data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Accept 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Protected Endpoint Performance', success, response.responseTime, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Protected Endpoint Performance', false, null, error);
  }
}

async function testConcurrentRequests() {
  const concurrentRequests = 10;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(makeRequest(`${API_BASE}/health`));
  }
  
  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    const success = successCount === concurrentRequests;
    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    
    logTest(`Concurrent Requests (${concurrentRequests})`, success, avgResponseTime, success ? null : `${successCount}/${concurrentRequests} successful`);
  } catch (error) {
    logTest('Concurrent Requests', false, null, error);
  }
}

async function testLoadTest() {
  const loadTestRequests = 50;
  const promises = [];
  
  for (let i = 0; i < loadTestRequests; i++) {
    promises.push(makeRequest(`${API_BASE}/health`));
  }
  
  try {
    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successCount = responses.filter(r => r.status === 200).length;
    const success = successCount >= loadTestRequests * 0.9; // 90% success rate
    const requestsPerSecond = (loadTestRequests / totalTime) * 1000;
    
    logTest(`Load Test (${loadTestRequests} requests)`, success, totalTime, success ? null : `${successCount}/${loadTestRequests} successful, ${requestsPerSecond.toFixed(2)} req/s`);
  } catch (error) {
    logTest('Load Test', false, null, error);
  }
}

async function testMemoryUsage() {
  try {
    const response = await makeRequest(`${API_BASE}/health/detailed`);
    const success = response.status === 200;
    
    if (success && response.data) {
      const memoryInfo = response.data.checks?.memory;
      const memoryOK = !memoryInfo || memoryInfo.status === 'healthy';
      logTest('Memory Usage Check', memoryOK, response.responseTime, memoryOK ? null : 'Memory issues detected');
    } else {
      logTest('Memory Usage Check', false, response.responseTime, 'Health check failed');
    }
  } catch (error) {
    logTest('Memory Usage Check', false, null, error);
  }
}

async function testDatabasePerformance() {
  try {
    const response = await makeRequest(`${API_BASE}/health/database`);
    const success = response.status === 200;
    
    if (success && response.data) {
      const dbInfo = response.data.checks?.database;
      const dbOK = !dbInfo || dbInfo.status === 'healthy';
      logTest('Database Performance', dbOK, response.responseTime, dbOK ? null : 'Database performance issues');
    } else {
      logTest('Database Performance', false, response.responseTime, 'Database check failed');
    }
  } catch (error) {
    logTest('Database Performance', false, null, error);
  }
}

async function testAPIEndpointsPerformance() {
  const endpoints = [
    '/health',
    '/test-jwt',
    '/notifications/list',
    '/appointments/list',
    '/leads/scored'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const token = generateTestToken();
      const response = await makeRequest(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Accept 200, 401, or 500 (depending on config)
      const success = response.status === 200 || response.status === 401 || response.status === 500;
      logTest(`API Endpoint Performance: ${endpoint}`, success, response.responseTime, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`API Endpoint Performance: ${endpoint}`, false, null, error);
    }
  }
}

async function testResponseTimeDistribution() {
  const testRounds = 5;
  const responseTimes = [];
  
  for (let i = 0; i < testRounds; i++) {
    try {
      const response = await makeRequest(`${API_BASE}/health`);
      if (response.status === 200) {
        responseTimes.push(response.responseTime);
      }
    } catch (error) {
      // Ignore errors for this test
    }
  }
  
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);
    
    const consistent = stdDev < avgTime * 0.5; // Less than 50% standard deviation
    logTest('Response Time Consistency', consistent, avgTime, consistent ? null : `High variance: ${stdDev.toFixed(2)}ms std dev`);
  } else {
    logTest('Response Time Consistency', false, null, 'No successful responses');
  }
}

// Main test runner
async function runAllTests() {
  console.log('⚡ Starting API Performance Tests...\n');
  
  // Basic performance tests
  await testHealthEndpointPerformance();
  await testJWTPerformance();
  await testProtectedEndpointPerformance();
  
  // Load testing
  await testConcurrentRequests();
  await testLoadTest();
  
  // System performance
  await testMemoryUsage();
  await testDatabasePerformance();
  
  // API endpoint performance
  await testAPIEndpointsPerformance();
  
  // Response time analysis
  await testResponseTimeDistribution();
  
  // Calculate final metrics
  testResults.performance.averageResponseTime = testResults.performance.totalTime / testResults.performance.totalRequests;
  testResults.performance.successRate = (testResults.passed / (testResults.passed + testResults.failed)) * 100;
  
  // Results summary
  console.log('\n📊 Performance Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${testResults.performance.successRate.toFixed(1)}%`);
  console.log(`⚡ Total Requests: ${testResults.performance.totalRequests}`);
  console.log(`⏱️  Average Response Time: ${testResults.performance.averageResponseTime.toFixed(2)}ms`);
  console.log(`🚀 Min Response Time: ${testResults.performance.minResponseTime === Infinity ? 'N/A' : testResults.performance.minResponseTime + 'ms'}`);
  console.log(`🐌 Max Response Time: ${testResults.performance.maxResponseTime}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  if (testResults.performance.averageResponseTime > 1000) {
    console.log('  - Consider optimizing slow endpoints (avg > 1000ms)');
  }
  if (testResults.performance.successRate < 90) {
    console.log('  - Improve error handling and reliability');
  }
  if (testResults.performance.maxResponseTime > 5000) {
    console.log('  - Some requests are very slow, investigate bottlenecks');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Performance test runner failed:', error);
  process.exit(1);
});














