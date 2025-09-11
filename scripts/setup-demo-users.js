const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function setupDemoUsers() {
  try {
    // Hash the demo password
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const users = {
      "users": [
        {
          "id": "1",
          "email": "demo@cloudgreet.com",
          "password": hashedPassword,
          "name": "Demo User",
          "companyName": "Demo Business",
          "businessType": "HVAC",
          "phoneNumber": "+1 (555) 123-4567",
          "createdAt": "2024-01-01T00:00:00.000Z",
          "onboardingStatus": "completed",
          "retellAgentId": "agent_demo_123",
          "phoneNumberAssigned": true
        },
        {
          "id": "2",
          "email": "admin@cloudgreet.com",
          "password": hashedPassword,
          "name": "Admin User",
          "companyName": "CloudGreet Admin",
          "businessType": "HVAC",
          "phoneNumber": "+1 (555) 999-8888",
          "createdAt": "2024-01-01T00:00:00.000Z",
          "onboardingStatus": "completed",
          "retellAgentId": "agent_admin_456",
          "phoneNumberAssigned": true
        }
      ]
    };

    // Write to users.json
    const usersFile = path.join(__dirname, '..', 'lib', 'users.json');
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    console.log('✅ Demo users setup complete!');
    console.log('📧 Demo credentials:');
    console.log('   Email: demo@cloudgreet.com');
    console.log('   Password: demo123');
    console.log('   Email: admin@cloudgreet.com');
    console.log('   Password: demo123');
    
  } catch (error) {
    console.error('❌ Error setting up demo users:', error);
  }
}

setupDemoUsers();

