const { execSync } = require('child_process');

console.log('🚀 Quick Deploy - Building and pushing changes...');

try {
  console.log('📦 Building...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('📝 Committing...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "fix: Position lines at button height with max z-index"', { stdio: 'inherit' });
  
  console.log('📤 Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('✅ Deployed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
