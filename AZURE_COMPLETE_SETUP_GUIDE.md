# Complete Azure Setup Guide for AI Voice Calls

## 🚀 **Azure Communication Services + Speech Services**

Azure can handle **everything** you need for AI voice calls and phone number management:

### **What Azure Provides**
- ✅ **Phone Number Purchasing** - Automatic phone number acquisition
- ✅ **Voice Calls** - Real-time voice conversations
- ✅ **AI Integration** - Speech-to-text and text-to-speech
- ✅ **Call Routing** - Direct calls to your AI
- ✅ **Analytics** - Call monitoring and stats
- ✅ **Webhooks** - Real-time event handling

## 📋 **Step-by-Step Setup**

### **1. Create Azure Account**
- Go to [portal.azure.com](https://portal.azure.com)
- Sign up with personal email (no business registration needed)
- Add payment method (personal credit card works)

### **2. Create Communication Services Resource**
1. In Azure Portal, search for "Communication Services"
2. Click "Create"
3. Choose "Free" tier (F0) for testing
4. Select region: "East US" or "West US 2"
5. Click "Review + Create"

### **3. Create Speech Services Resource**
1. In Azure Portal, search for "Speech Services"
2. Click "Create"
3. Choose "Free" tier (F0) for testing
4. Select same region as Communication Services
5. Click "Review + Create"

### **4. Get API Keys and Connection Strings**

#### **Communication Services**
- Go to your Communication Services resource
- Click "Keys and Connection String" in left menu
- Copy **Connection String** and **Resource Name**

#### **Speech Services**
- Go to your Speech Services resource
- Click "Keys and Endpoint" in left menu
- Copy **Key 1** and **Region**

### **5. Add to Environment Variables**
Add to your `.env.local` file:
```bash
# Azure Communication Services (for phone calls)
AZURE_COMMUNICATION_CONNECTION_STRING=your_connection_string_here
AZURE_COMMUNICATION_RESOURCE_NAME=your_resource_name_here

# Azure Speech Services (for AI voice)
AZURE_SPEECH_KEY=your_speech_key_here
AZURE_SPEECH_REGION=eastus
```

## 🎯 **Automated Onboarding Process**

Once you add the API keys, your system will automatically:

### **Step 1: Create AI Voice Agent**
- ✅ Set up Azure Speech Services
- ✅ Configure voice personality
- ✅ Enable conversation flows
- ✅ Set up intent recognition

### **Step 2: Purchase Phone Number**
- ✅ Automatically purchase phone number
- ✅ Configure call routing to AI
- ✅ Set up voice and SMS capabilities
- ✅ Enable call recording

### **Step 3: Set up Calendar Integration**
- ✅ Connect to client's calendar
- ✅ Enable automatic booking
- ✅ Set up confirmations
- ✅ Configure reminders

### **Step 4: Create Billing Account**
- ✅ Set up Stripe customer
- ✅ Create subscription
- ✅ Enable automatic billing
- ✅ Track usage

### **Step 5: Send Welcome Email**
- ✅ Send onboarding confirmation
- ✅ Include phone number and instructions
- ✅ Provide dashboard access
- ✅ Set up support contact

### **Step 6: Enable Analytics**
- ✅ Set up call monitoring
- ✅ Enable sentiment analysis
- ✅ Configure reporting
- ✅ Set up alerts

## 📞 **How Phone Calls Work**

### **Customer Calls Your Number**
1. **Azure receives call** on your purchased number
2. **Call routed to AI** via webhook
3. **AI answers** using Speech Services
4. **Conversation flows** naturally
5. **AI books appointments** automatically
6. **Call recorded** for analytics

### **AI Capabilities**
- ✅ **Natural conversation** - Understands context
- ✅ **Intent recognition** - Identifies what customer wants
- ✅ **Entity extraction** - Gets dates, times, services
- ✅ **Calendar booking** - Books appointments automatically
- ✅ **Email confirmations** - Sends confirmations
- ✅ **Sentiment analysis** - Tracks customer satisfaction

## 💰 **Pricing**

### **Free Tier (F0)**
- **Communication Services**: 1,000 minutes/month
- **Speech Services**: 5 hours/month
- **Perfect for testing and small businesses**

### **Standard Tier (S0)**
- **Communication Services**: $0.004/minute
- **Speech Services**: $1/hour
- **Real-time processing and advanced features**

## 🔧 **API Endpoints**

### **Automated Onboarding**
```bash
POST /api/automated-onboarding-simple
{
  "business_name": "Your Business",
  "business_type": "Restaurant",
  "email": "your@email.com",
  "services": ["Dining", "Catering"],
  "ai_personality": "professional",
  "area_code": "555",
  "country": "US",
  "calendar_provider": "google"
}
```

### **Phone Number Management**
```bash
POST /api/azure-phone-integration
{
  "business_name": "Your Business",
  "area_code": "555",
  "country": "US",
  "voice_enabled": true,
  "sms_enabled": true
}
```

### **Calendar Integration**
```bash
POST /api/calendar/universal-calendar
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "service_type": "Consultation",
  "preferred_date": "2024-01-15",
  "preferred_time": "14:00",
  "calendar_provider": "google"
}
```

## 🚀 **Ready to Go!**

Once you add the Azure API keys:

1. **Run automated onboarding** - Everything set up automatically
2. **Get your phone number** - Ready to receive calls
3. **Test your AI** - Call your number to test
4. **Monitor analytics** - Track calls and performance
5. **Scale up** - Add more features as needed

## 📊 **What You Get**

### **Complete Automation**
- ✅ **Phone number purchased** automatically
- ✅ **AI voice agent** created and configured
- ✅ **Calendar integration** set up
- ✅ **Billing account** created
- ✅ **Analytics dashboard** ready
- ✅ **Welcome email** sent

### **Professional Features**
- ✅ **Real-time voice calls** with AI
- ✅ **Automatic appointment booking**
- ✅ **Email confirmations**
- ✅ **Call recording and analytics**
- ✅ **Sentiment analysis**
- ✅ **Multi-language support**

**Your AI receptionist is ready to take calls and book appointments automatically!**
