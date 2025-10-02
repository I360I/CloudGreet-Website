// Check the actual structure of the users table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  try {
    console.log('🔍 Checking users table structure...');
    
    // Try to get the table structure
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error querying users table:', error.message);
    } else {
      console.log('✅ Users table structure:');
      if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
      } else {
        console.log('Table is empty, but accessible');
      }
    }
    
    // Also check businesses table structure
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .limit(1);
    
    if (businessError) {
      console.log('❌ Error querying businesses table:', businessError.message);
    } else {
      console.log('✅ Businesses table structure:');
      if (businessData && businessData.length > 0) {
        console.log('Columns:', Object.keys(businessData[0]));
      } else {
        console.log('Table is empty, but accessible');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsersTable();
