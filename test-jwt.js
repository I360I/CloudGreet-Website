// Test JWT token creation and verification
const jwt = require('jsonwebtoken')

const testJWT = () => {
  console.log('🔍 TESTING JWT TOKEN CREATION AND VERIFICATION')
  console.log('========================================')
  
  // Test data
  const testUserId = 'test-user-id'
  const testBusinessId = 'test-business-id'
  const testEmail = 'test@example.com'
  
  // Create token (same as registration API)
  const token = jwt.sign(
    { 
      userId: testUserId,
      email: testEmail,
      businessId: testBusinessId,
      role: 'owner',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      iss: 'cloudgreet',
      aud: 'cloudgreet-api'
    },
    'your_jwt_secret_key_minimum_32_characters', // Same as in your .env.local
    { 
      algorithm: 'HS256',
      keyid: 'v1'
    }
  )
  
  console.log('✅ Token created successfully')
  console.log('Token length:', token.length)
  console.log('Token preview:', token.substring(0, 50) + '...')
  
  // Verify token (same as dashboard API)
  try {
    const decoded = jwt.verify(token, 'your_jwt_secret_key_minimum_32_characters')
    console.log('✅ Token verified successfully')
    console.log('Decoded data:', {
      userId: decoded.userId,
      businessId: decoded.businessId,
      email: decoded.email,
      role: decoded.role
    })
  } catch (error) {
    console.log('❌ Token verification failed:', error.message)
  }
  
  console.log('')
  console.log('🎯 TESTING WITH REAL TOKEN FROM API...')
  
  // Test with a real token from the API
  const realToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InYxIn0.eyJ1c2VySWQiOiJmNTg5OTI1Yy03YzBhLTRiYjItYTIyNy1jZDgwOWEwODJiMjUiLCJlbWFpbCI6ImpvdXJuZXkxNzU4ODUyMDI2NzcxQGV4YW1wbGUuY29tIiwiYnVzaW5lc3NJZCI6Ijg2MWU4ZmYxLTQwZTctNGY2Mi05MDc5LTkwM2Y5NjJmNTZiZCIsInJvbGUiOiJvd25lciIsImlhdCI6MTc1ODg1MjA0MiwiZXhwIjoxNzU5NDU2ODQyLCJpc3MiOiJjbG91ZGdyZWV0IiwiYXVkIjoiY2xvdWRncmVldC1hcGkifQ.8XjK9mP2vL5nR7sT3wY6eA1bC4dF8hJ0kM3pQ6tU9xZ'
  
  try {
    const decoded = jwt.verify(realToken, 'your_jwt_secret_key_minimum_32_characters')
    console.log('✅ Real token verified successfully')
    console.log('Decoded data:', {
      userId: decoded.userId,
      businessId: decoded.businessId,
      email: decoded.email,
      role: decoded.role
    })
  } catch (error) {
    console.log('❌ Real token verification failed:', error.message)
  }
}

testJWT()
