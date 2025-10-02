// Simple server test to check what's happening
const fetch = require('node-fetch');

async function testServer() {
  console.log('🔍 Testing server status...');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testServer();
