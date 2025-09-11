// Test script to verify login functionality
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🧪 Testing login functionality...\n');
    
    // Test the login endpoint
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        redirect: false
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login test successful!');
      console.log('Response:', result);
    } else {
      console.log('❌ Login test failed');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.log('❌ Error testing login:', error.message);
    console.log('Make sure the development server is running on localhost:3000');
  }
}

// Wait a moment for the server to start, then test
setTimeout(testLogin, 3000);
