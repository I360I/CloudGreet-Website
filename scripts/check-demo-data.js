#!/usr/bin/env node

console.log('🔍 CHECKING DEMO DATA IN DATABASE...\n');

console.log('📋 DEMO DATA THAT SHOULD EXIST:');
console.log('');
console.log('BUSINESS:');
console.log('ID: 00000000-0000-0000-0000-000000000001');
console.log('Name: CloudGreet Demo');
console.log('Phone: +18333956731');
console.log('');
console.log('AI AGENT:');
console.log('ID: 00000000-0000-0000-0000-000000000002');
console.log('Business ID: 00000000-0000-0000-0000-000000000001');
console.log('Name: CloudGreet Demo Agent');
console.log('');

console.log('🚨 IF THIS DATA IS MISSING:');
console.log('The voice webhook won\'t be able to find the business/agent,');
console.log('so it won\'t know how to respond to the call.');
console.log('');

console.log('🔧 TO CHECK YOUR DATABASE:');
console.log('');
console.log('1. GO TO SUPABASE DASHBOARD:');
console.log('   - Open your Supabase project');
console.log('   - Go to Table Editor');
console.log('');
console.log('2. CHECK BUSINESSES TABLE:');
console.log('   - Look for business with ID: 00000000-0000-0000-0000-000000000001');
console.log('   - Check if it has the right phone number: +18333956731');
console.log('   - Check if it has greeting_message and other required fields');
console.log('');
console.log('3. CHECK AI_AGENTS TABLE:');
console.log('   - Look for agent with ID: 00000000-0000-0000-0000-000000000002');
console.log('   - Check if it\'s linked to the demo business');
console.log('   - Check if it has configuration and greeting_message');
console.log('');
console.log('4. CHECK CALLS TABLE:');
console.log('   - Look for recent calls');
console.log('   - Check if they have the right business_id');
console.log('   - Check if they have call_id from Telnyx');
console.log('');

console.log('🚨 COMMON ISSUES:');
console.log('');
console.log('1. DEMO DATA NOT CREATED:');
console.log('   - The simplified click-to-call route doesn\'t create demo data');
console.log('   - Voice webhook can\'t find business/agent');
console.log('   - No greeting message or AI configuration');
console.log('');
console.log('2. WRONG BUSINESS ID:');
console.log('   - Click-to-call uses hardcoded business ID');
console.log('   - But that business doesn\'t exist in database');
console.log('   - Voice webhook fails to find business');
console.log('');
console.log('3. MISSING AI AGENT:');
console.log('   - No AI agent linked to the business');
console.log('   - Voice webhook can\'t find agent configuration');
console.log('   - No AI conversation possible');
console.log('');

console.log('💡 QUICK FIXES:');
console.log('');
console.log('1. CREATE DEMO DATA MANUALLY:');
console.log('   - Run the database migration script');
console.log('   - Or create the demo business/agent manually');
console.log('');
console.log('2. RESTORE DEMO DATA CREATION:');
console.log('   - Add back the business/agent creation logic');
console.log('   - Make sure it runs before storing the call');
console.log('');
console.log('3. USE EXISTING BUSINESS:');
console.log('   - Find an existing business in your database');
console.log('   - Update the click-to-call to use that business ID');
console.log('');

console.log('📞 IMMEDIATE ACTIONS:');
console.log('1. Check your Supabase database for demo data');
console.log('2. If missing, create the demo business and agent');
console.log('3. Test the call again');
console.log('4. Check Vercel logs for voice webhook errors');
console.log('');

console.log('🔍 TO CREATE DEMO DATA:');
console.log('Run this SQL in your Supabase SQL Editor:');
console.log('');
console.log('-- Create demo business');
console.log('INSERT INTO businesses (id, business_name, business_type, phone_number, greeting_message)');
console.log('VALUES (\'00000000-0000-0000-0000-000000000001\', \'CloudGreet Demo\', \'HVAC\', \'+18333956731\', \'Thank you for calling CloudGreet Demo! How can I help you today?\')');
console.log('ON CONFLICT (id) DO NOTHING;');
console.log('');
console.log('-- Create demo AI agent');
console.log('INSERT INTO ai_agents (id, business_id, agent_name, is_active, greeting_message)');
console.log('VALUES (\'00000000-0000-0000-0000-000000000002\', \'00000000-0000-0000-0000-000000000001\', \'CloudGreet Demo Agent\', true, \'Thank you for calling CloudGreet Demo! How can I help you today?\')');
console.log('ON CONFLICT (id) DO NOTHING;');
