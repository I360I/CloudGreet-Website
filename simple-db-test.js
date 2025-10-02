// simple-db-test.js
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Environment check:')
console.log('SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

try {
  const { createClient } = require('@supabase/supabase-js')
  console.log('✅ Supabase client loaded successfully')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  console.log('✅ Supabase client created')
  
  // Test a simple query
  supabase.from('businesses').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Database error:', error.message)
      } else {
        console.log('✅ Database query successful')
      }
    })
    .catch(err => {
      console.log('❌ Database exception:', err.message)
    })
    
} catch (err) {
  console.log('❌ Failed to load Supabase:', err.message)
}
