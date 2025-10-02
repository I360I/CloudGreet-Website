// setup-database.js
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🚀 Setting up CloudGreet database...')
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('COMPLETE_DATABASE_SETUP.sql', 'utf8')
    console.log('📄 SQL file loaded, size:', sqlContent.length, 'characters')
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 Found ${statements.length} SQL statements`)
    
    // Execute each statement
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length < 10) continue // Skip very short statements
      
      try {
        console.log(`\n🔍 Executing statement ${i + 1}/${statements.length}...`)
        console.log(`📝 ${statement.substring(0, 100)}...`)
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message)
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1} succeeded`)
          successCount++
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1} exception:`, err.message)
        errorCount++
      }
    }
    
    console.log(`\n🏁 Database setup complete!`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
  } catch (err) {
    console.log('❌ Setup failed:', err.message)
  }
}

setupDatabase().catch(console.error)
