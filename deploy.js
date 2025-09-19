const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting deployment...');

// Build the project
console.log('📦 Building project...');
execSync('npm run build', { stdio: 'inherit' });

// Create deployment package
console.log('📁 Creating deployment package...');
execSync('tar -czf deployment.tar.gz .next package.json package-lock.json next.config.js tailwind.config.ts postcss.config.js tsconfig.json', { stdio: 'inherit' });

console.log('✅ Deployment package created: deployment.tar.gz');
console.log('📤 Upload this file to Vercel dashboard manually');
console.log('🌐 Or run: npx vercel --prod');
