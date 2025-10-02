// Deploy Fix Script
const { execSync } = require('child_process');

console.log('🚀 DEPLOYING REGISTRATION FIX...');
console.log('=====================================');

try {
  console.log('\n1️⃣ Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\n2️⃣ Deploying to production...');
  execSync('vercel --prod', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment complete!');
  console.log('\n🧪 Testing registration after deployment...');
  
  // Wait a moment for deployment to propagate
  setTimeout(() => {
    const APP_URL = 'https://cloudgreet.com';
    const testData = {
      business_name: 'Post-Deploy Test ' + Date.now(),
      business_type: 'HVAC Services',
      owner_name: 'Test Owner',
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123',
      phone: '5551234567',
      address: '123 Test St',
      website: 'https://test.com',
      services: ['HVAC Repair'],
      service_areas: ['Test City']
    };

    fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.log('❌ Registration still failing:', data.error.message);
      } else {
        console.log('🎉 Registration working! User ID:', data.data?.user?.id);
      }
    })
    .catch(error => {
      console.log('❌ Test error:', error.message);
    });
  }, 30000); // Wait 30 seconds for deployment to propagate

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
}
