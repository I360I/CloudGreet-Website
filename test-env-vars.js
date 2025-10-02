// Test environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Environment Variables...');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
  console.log('❌ JWT_SECRET is not properly configured');
  console.log('Current value:', process.env.JWT_SECRET);
} else {
  console.log('✅ JWT_SECRET is properly configured');
}