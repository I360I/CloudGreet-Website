# Azure Cognitive Services Setup Guide

## 🚀 **Why Azure? (Best for Automation + Stats)**

Azure Cognitive Services offers the **best combination** of:
- ✅ **Advanced Automation**: Full conversation flow management
- ✅ **Built-in Analytics**: Real-time monitoring and stats
- ✅ **No Business Registration**: Just need Microsoft account
- ✅ **Cost Effective**: $1-4/month for basic usage
- ✅ **Enterprise Grade**: Reliable and scalable

## 📋 **Setup Steps**

### 1. **Create Microsoft Account**
- Go to [portal.azure.com](https://portal.azure.com)
- Sign up with personal email (no business registration needed)
- Add payment method (can use personal credit card)

### 2. **Create Speech Service**
- In Azure Portal, search for "Speech Services"
- Click "Create"
- Choose "Free" tier (F0) for testing
- Select region: "East US" or "West US 2"
- Click "Review + Create"

### 3. **Get API Keys**
- Go to your Speech Service resource
- Click "Keys and Endpoint" in left menu
- Copy **Key 1** and **Region**

### 4. **Add to Environment**
Add to your `.env.local` file:
```bash
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

## 🎯 **Features You Get**

### **Automation Features**
- Real-time conversation management
- Intent recognition and routing
- Custom conversation flows
- Automatic call handling
- Webhook integration

### **Analytics & Stats**
- Call volume tracking
- Conversion rate monitoring
- Sentiment analysis
- Call recording and transcription
- Real-time dashboards
- Custom reporting

### **Calendar Integration**
- **Automatic Appointment Booking**: AI can book appointments directly
- **Real-time Availability**: Check and update calendar in real-time
- **Natural Language Processing**: Understand "next Tuesday" or "2 PM"
- **Intent Recognition**: Identify booking, rescheduling, and cancellation requests
- **Entity Extraction**: Extract dates, times, services, and customer details
- **Confirmation Automation**: Send email confirmations automatically
- **Reminder System**: Set up automatic appointment reminders
- **Recurring Appointments**: Handle repeating bookings

### **Voice Quality**
- Professional AI voices
- Natural conversation flow
- Multiple language support
- Custom voice training (optional)

## 💰 **Pricing**

### **Free Tier (F0)**
- 5 hours of speech-to-text per month
- 5 hours of text-to-speech per month
- Perfect for testing and small businesses

### **Standard Tier (S0)**
- $1 per hour for speech-to-text
- $4 per hour for text-to-speech
- Real-time processing
- Advanced features

## 🔧 **Integration**

The system automatically:
1. **Creates Azure Voice Agent** when you complete onboarding
2. **Sets up analytics tracking** for all calls
3. **Provides real-time stats** via API
4. **Handles webhook events** for automation

## 📊 **Stats Dashboard**

Access your stats at: `/api/azure-voice-stats`

Includes:
- Total calls and conversion rates
- Sentiment analysis
- Call volume trends
- Top intents and outcomes
- Recording quality metrics

## 🚀 **Ready to Go!**

Once you add the API keys, your system will:
- ✅ Create professional AI voice agents
- ✅ Track all call analytics automatically
- ✅ Provide real-time monitoring
- ✅ Handle complex conversation flows
- ✅ Generate detailed reports

**No business registration required - just a Microsoft account!**
