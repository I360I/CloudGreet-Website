# Calendar Integration Setup Guide

## 🗓️ **Universal Calendar Integration**

Your AI voice agent can now integrate with **any calendar system** your clients use! Here are the supported providers:

### **Supported Calendar Providers**

1. **Google Calendar** - Most popular, easy setup
2. **Microsoft Outlook** - Enterprise standard
3. **Apple Calendar** - iOS/Mac users
4. **Calendly** - Professional scheduling
5. **Custom Calendar** - Any system via webhook

## 🚀 **How It Works**

### **Customer Calls → AI Books Appointment**

1. **Customer calls** your AI receptionist
2. **AI identifies** booking intent
3. **AI checks** calendar availability
4. **AI books** appointment automatically
5. **AI sends** confirmation email
6. **Calendar syncs** in real-time

### **Example Conversation**

**Customer**: "Hi, I'd like to book an appointment for next Tuesday at 2 PM"

**AI**: 
- ✅ Recognizes booking intent
- ✅ Extracts "next Tuesday" and "2 PM"
- ✅ Checks your calendar availability
- ✅ Books the appointment
- ✅ Sends confirmation email
- ✅ Updates your calendar

## 📋 **Setup Instructions**

### **1. Google Calendar Setup**

```bash
# Add to .env.local
GOOGLE_CALENDAR_API_KEY=your_google_api_key
GOOGLE_CLIENT_ID=your_google_client_id
```

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Calendar API
4. Create credentials (API key)
5. Add to your environment variables

### **2. Microsoft Outlook Setup**

```bash
# Add to .env.local
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
```

**Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Register new application
3. Add Microsoft Graph permissions
4. Generate client secret
5. Add to your environment variables

### **3. Apple Calendar Setup**

```bash
# Add to .env.local
APPLE_CALENDAR_WEBHOOK_URL=your_apple_webhook_url
```

**Steps:**
1. Set up webhook endpoint
2. Configure Apple Calendar integration
3. Add webhook URL to environment

### **4. Calendly Setup**

```bash
# Add to .env.local
CALENDLY_API_KEY=your_calendly_api_key
CALENDLY_EVENT_TYPE=your_event_type_id
```

**Steps:**
1. Go to [Calendly API](https://calendly.com/api-documentation)
2. Generate API key
3. Get event type ID
4. Add to your environment variables

### **5. Custom Calendar Setup**

```bash
# Add to .env.local
CUSTOM_CALENDAR_WEBHOOK_URL=your_custom_webhook_url
```

**Steps:**
1. Create webhook endpoint in your system
2. Configure to receive booking data
3. Add webhook URL to environment

## 🔧 **API Endpoints**

### **Book Appointment**
```bash
POST /api/calendar/universal-calendar
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "service_type": "Consultation",
  "preferred_date": "2024-01-15",
  "preferred_time": "14:00",
  "duration": 60,
  "notes": "First time customer",
  "calendar_provider": "google"
}
```

### **Check Availability**
```bash
GET /api/calendar/universal-calendar?provider=google&date=2024-01-15
```

## 📊 **Features**

### **Automatic Booking**
- ✅ Real-time calendar checking
- ✅ Automatic appointment creation
- ✅ Email confirmations
- ✅ Reminder notifications
- ✅ Rescheduling support

### **Multi-Provider Support**
- ✅ Google Calendar
- ✅ Microsoft Outlook
- ✅ Apple Calendar
- ✅ Calendly
- ✅ Custom systems

### **Smart Integration**
- ✅ Natural language processing
- ✅ Intent recognition
- ✅ Entity extraction
- ✅ Conflict detection
- ✅ Time zone handling

## 🎯 **Client Benefits**

### **For Your Clients**
- **No Setup Required**: Works with their existing calendar
- **Automatic Sync**: Appointments appear instantly
- **Email Confirmations**: Professional confirmations
- **Reminder System**: Automatic reminders
- **Rescheduling**: Easy rescheduling via phone

### **For You**
- **Universal Compatibility**: Works with any calendar
- **Real-time Sync**: Always up-to-date
- **Professional Service**: Automated confirmations
- **Reduced No-shows**: Automatic reminders
- **Better Organization**: Centralized booking system

## 🚀 **Ready to Use**

Once you configure your preferred calendar provider:

1. **AI automatically books** appointments during calls
2. **Calendar syncs** in real-time
3. **Confirmations sent** automatically
4. **Reminders scheduled** automatically
5. **Rescheduling handled** seamlessly

**Your AI receptionist now handles the entire booking process automatically!**
