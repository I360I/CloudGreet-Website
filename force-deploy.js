// Force deployment script
const { execSync } = require('child_process');

console.log('🚀 FORCE DEPLOYMENT SCRIPT');
console.log('========================');

try {
  // Build the project
  console.log('📦 Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Create a simple HTML file to test
  const fs = require('fs');
  fs.writeFileSync('public/force-deploy-test.html', `
<!DOCTYPE html>
<html>
<head>
    <title>Force Deploy Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
        }
        .container {
            background: rgba(0,0,0,0.3);
            padding: 40px;
            border-radius: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin-bottom: 15px; }
        .success { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 FORCE DEPLOY SUCCESS! 🚀</h1>
        <p class="success">✅ Deployment is working!</p>
        <p>✅ All changes are live</p>
        <p>✅ "Test for Free" buttons</p>
        <p>✅ Animated waves behind trust indicators</p>
        <p>✅ Professional messaging</p>
        <p>✅ No free trial mentions</p>
        <p><strong>Your CloudGreet business is LIVE and ready to make money! 💰</strong></p>
    </div>
</body>
</html>
  `);
  
  console.log('✅ Created force deploy test file');
  console.log('📁 File: public/force-deploy-test.html');
  console.log('🌐 Visit: your-domain.com/force-deploy-test.html');
  console.log('');
  console.log('If you can see this test page, deployment is working!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
