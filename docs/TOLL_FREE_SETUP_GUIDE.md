# CloudGreet Toll-Free Setup Guide

## 🚀 Complete Setup Instructions

### **Phase 1: Telnyx Toll-Free Number Setup**

#### **Step 1: Purchase Toll-Free Numbers**
1. **Login to Telnyx Dashboard**
2. **Go to Numbers → Buy Numbers**
3. **Select "Toll-Free"** (800, 888, 877, 866, 855, 844, 833)
4. **Purchase 5-10 numbers** to start
5. **Cost**: ~$1-2/month per number

#### **Step 2: Configure Each Number**
For each toll-free number:
1. **Go to Numbers → Manage Numbers**
2. **Click on your toll-free number**
3. **Set Connection Type**: "Telnyx API"
4. **Set Inbound**: "Telnyx API"
5. **Set Outbound**: "Telnyx API"
6. **Save Configuration**

#### **Step 3: Create Messaging Profile**
1. **Go to Messaging → Messaging Profiles**
2. **Create New Profile**: "CloudGreet Toll-Free"
3. **Add all your toll-free numbers** to this profile
4. **Enable SMS** for the profile
5. **Save Profile**

### **Phase 2: CloudGreet Integration**

#### **Step 4: Update Environment Variables**
Add to your `.env.local`:
```env
# Toll-Free Configuration
TELYNX_TOLL_FREE_NUMBERS=+18005551234,+18005551235,+18005551236
TELYNX_MESSAGING_PROFILE_ID=your_messaging_profile_id
TELYNX_NOTIFICATION_NUMBER=+18005551234
```

#### **Step 5: Test Toll-Free SMS**
1. **Go to CloudGreet Admin Dashboard**
2. **Testing Lab → SMS Test**
3. **Send test message** to your personal number
4. **Verify delivery**

### **Phase 3: Client Onboarding Automation**

#### **Step 6: Automated Number Assignment**
When a new client registers:
1. **System automatically assigns** next available toll-free number
2. **AI voice agent** is configured for that number
3. **Call forwarding** is set up to your phone
4. **SMS notifications** are enabled

#### **Step 7: Client Dashboard Setup**
Each client gets:
- ✅ **Their own toll-free number**
- ✅ **AI voice agent** configured
- ✅ **Call analytics dashboard**
- ✅ **SMS capability**
- ✅ **Custom greeting** setup

### **Phase 4: Manual Setup Steps**

#### **Step 8: Call Forwarding Setup**
For each client's toll-free number:
1. **Go to Telnyx → Numbers**
2. **Click on client's toll-free number**
3. **Set Inbound Call Handling**:
   - **Primary**: "Forward to AI Agent"
   - **Fallback**: "Forward to Your Phone"
4. **Set AI Agent URL**: `https://cloudgreet.com/api/telnyx/voice-handler`
5. **Save Configuration**

#### **Step 9: AI Agent Configuration**
For each client:
1. **Go to CloudGreet Admin Dashboard**
2. **Clients → Select Client**
3. **Configure AI Agent**:
   - **Business Name**: Client's business name
   - **Services**: Client's services
   - **Hours**: Client's business hours
   - **Greeting**: Custom greeting message
4. **Test AI Agent** with test call

#### **Step 10: SMS Template Setup**
1. **Go to CloudGreet Admin Dashboard**
2. **SMS Templates → Create Templates**
3. **Create templates for**:
   - Appointment confirmations
   - Follow-up messages
   - Reminder messages
4. **Assign templates** to each client

### **Phase 5: Testing & Launch**

#### **Step 11: Full System Test**
1. **Test toll-free voice calls**
2. **Test SMS delivery**
3. **Test call forwarding**
4. **Test AI agent responses**
5. **Test client dashboard**

#### **Step 12: Client Onboarding**
1. **Send client their toll-free number**
2. **Provide setup instructions**
3. **Test their system**
4. **Go live!**

## 🎯 **Quick Start Checklist**

### **Day 1: Setup**
- [ ] Purchase 5 toll-free numbers from Telnyx
- [ ] Configure numbers in Telnyx
- [ ] Create messaging profile
- [ ] Update CloudGreet environment variables
- [ ] Test SMS functionality

### **Day 2: Integration**
- [ ] Set up call forwarding for each number
- [ ] Configure AI agents for each client
- [ ] Create SMS templates
- [ ] Test full system

### **Day 3: Launch**
- [ ] Onboard first client
- [ ] Test client's toll-free number
- [ ] Go live and start generating revenue!

## 📞 **Support & Troubleshooting**

### **Common Issues:**
1. **SMS not delivering**: Check messaging profile configuration
2. **Calls not forwarding**: Verify call handling settings
3. **AI not responding**: Check voice handler URL
4. **Client can't access dashboard**: Verify user permissions

### **Need Help?**
- **Telnyx Support**: Available 24/7
- **CloudGreet Admin Dashboard**: Built-in help system
- **Documentation**: Complete setup guides available

## 💰 **Pricing Breakdown**
- **Toll-free numbers**: $1-2/month each
- **SMS messages**: $0.01-0.02 per message
- **Voice calls**: $0.01-0.02 per minute
- **Total cost per client**: ~$2-5/month

## 🚀 **Ready to Launch!**
Your CloudGreet platform with toll-free numbers is ready to generate revenue immediately!
