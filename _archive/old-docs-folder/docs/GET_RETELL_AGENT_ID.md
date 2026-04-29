# 🤖 GET RETELL AI AGENT ID

## **Step 1: Create AI Agent in Retell**

1. **Go to Retell Dashboard**: https://retellai.com/dashboard
2. **Sign in** with your account
3. **Click "Create Agent"**
4. **Configure your AI receptionist**:
   - **Name**: "CloudGreet AI Receptionist"
   - **Voice**: Choose a professional voice
   - **Language**: English
   - **Personality**: Professional and helpful

## **Step 2: Configure Agent Settings**

**Basic Configuration**:
- **Greeting**: "Thank you for calling [Business Name]. How can I help you today?"
- **Capabilities**: 
  - ✅ Answer questions about services
  - ✅ Schedule appointments
  - ✅ Qualify leads
  - ✅ Take messages

**Advanced Settings**:
- **Max Call Duration**: 10 minutes
- **Interruption Sensitivity**: Medium
- **Background Noise**: Enabled

## **Step 3: Get Agent ID**

1. **After creating the agent**, you'll see an **Agent ID**
2. **Copy the Agent ID** (looks like: `agent_1234567890abcdef`)
3. **Update your .env.local file**:
   ```
   NEXT_PUBLIC_RETELL_AGENT_ID=your_actual_agent_id_here
   ```

## **Step 4: Test AI Receptionist**

Once you have the Agent ID:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test the AI receptionist**:
   - Go to your dashboard
   - Try making a test call
   - Verify voice responses work

## **Quick Test Script**

I can create a test script to verify the AI receptionist is working once you have the Agent ID.

**Ready to create your AI agent?** 🚀
