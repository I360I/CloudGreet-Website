// Script to check Vercel deployment status
// This can be used to monitor when deployments complete

const https = require('https');

function checkDeploymentStatus() {
  return new Promise((resolve, reject) => {
    // Check if the site is accessible and get a unique identifier
    // We'll check the dashboard page and look for bundle hash changes
    const options = {
      hostname: 'cloudgreet.com',
      path: '/dashboard',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // Extract bundle hash from HTML if possible
        const bundleHashMatch = data.match(/page-([a-f0-9]+)\.js/);
        const bundleHash = bundleHashMatch ? bundleHashMatch[1] : null;
        
        resolve({
          status: res.statusCode,
          bundleHash: bundleHash,
          timestamp: new Date().toISOString()
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

if (require.main === module) {
  checkDeploymentStatus()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { checkDeploymentStatus };

