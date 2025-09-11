// Create a test user for development
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      hashed_password: hashedPassword,
      business_name: 'Test Business',
      business_type: 'hvac',
      phone_number: '+1234567890',
      created_at: new Date().toISOString()
    };
    
    console.log('🔐 Test User Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('');
    console.log('📋 SQL to create user in your database:');
    console.log(`
INSERT INTO users (email, hashed_password, business_name, business_type, phone_number, created_at)
VALUES (
  'test@example.com',
  '${hashedPassword}',
  'Test Business',
  'hvac',
  '+1234567890',
  '${testUser.created_at}'
);
    `);
    
    console.log('⚠️  Note: You need to run this SQL in your Supabase database or create the user through your admin panel.');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
}

createTestUser();
