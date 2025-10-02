// Simple test to check if server is responding
const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${res.statusCode === 200 ? '✅' : '❌'} ${description} - Status: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          console.log(`   Response: ${data.substring(0, 100)}...`);
        }
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${description} - Error: ${error.message}`);
      resolve({ success: false, status: 'error', error: error.message });
    });
    
    req.setTimeout(5000, () => {
      console.log(`❌ ${description} - Timeout`);
      req.destroy();
      resolve({ success: false, status: 'timeout' });
    });
  });
}

async function runSimpleTest() {
  console.log('🔍 SIMPLE SERVER TEST');
  console.log('=====================\n');
  
  await testEndpoint('/api/health', 'Health Check');
  await testEndpoint('/api/admin/auth', 'Admin Auth');
  await testEndpoint('/api/pricing/plans', 'Pricing Plans');
  await testEndpoint('/api/admin/system-health', 'System Health');
  
  console.log('\n✅ Simple test complete');
}

runSimpleTest().catch(console.error);
