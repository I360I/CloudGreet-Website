console.log('Testing basic functionality...');

// Test 1: Environment
require('dotenv').config({ path: '.env.local' });
console.log('Env loaded:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO');

// Test 2: Database
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('businesses').select('id').limit(1)
  .then(result => {
    if (result.error) {
      console.log('Database Error:', result.error.message);
    } else {
      console.log('Database OK');
    }
  })
  .catch(err => console.log('Connection Error:', err.message));

console.log('Test completed');