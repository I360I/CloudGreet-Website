// Minimal test to see exact error
const testMinimal = async () => {
  try {
    console.log('Testing registration...')
    
    const response = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Minimal Test',
        business_type: 'HVAC',
        owner_name: 'Test Owner',
        email: `minimal${Date.now()}@test.com`,
        password: 'test123',
        phone: '5551234567',
        address: '123 Test St'
      })
    })
    
    const text = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', text)
    
  } catch (error) {
    console.log('Error:', error.message)
  }
}

testMinimal()
