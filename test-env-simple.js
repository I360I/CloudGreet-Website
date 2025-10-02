// Simple test to check environment variables
const fs = require('fs');

try {
  // Read .env.local file directly
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('✅ .env.local file exists and is readable');
  
  // Parse environment variables
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  console.log('Environment variables found:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('TELYNX_API_KEY:', envVars.TELYNX_API_KEY ? 'SET' : 'NOT SET');
  console.log('JWT_SECRET:', envVars.JWT_SECRET ? 'SET' : 'NOT SET');
  
  if (envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')) {
    console.log('❌ ERROR: Still using placeholder values!');
  } else if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('✅ Real Supabase URL detected!');
  } else {
    console.log('❌ No Supabase URL found!');
  }
  
} catch (error) {
  console.error('❌ Error reading .env.local:', error.message);
}
