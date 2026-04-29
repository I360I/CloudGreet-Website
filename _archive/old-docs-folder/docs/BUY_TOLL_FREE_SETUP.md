# 📞 **Buy Toll-Free Number & Setup Notifications**

## **STEP 1: Buy Toll-Free Number in Telnyx**

### **1. Login to Telnyx:**
https://portal.telnyx.com

### **2. Go to Numbers:**
- Click "Numbers" in left sidebar
- Click "Buy Numbers"

### **3. Search for Toll-Free:**
- Click "Toll-Free" tab
- Select any prefix: 800, 888, 877, 866, 855, 844, or 833
- Click "Search"

### **4. Purchase:**
- Pick any available number
- Click "Buy Number"
- Confirm purchase (~$2-5/month)

### **5. Configure the Number:**
- Click on your new number
- Under "Messaging Profile", select your existing profile
- Under "Connection", select your existing connection
- Click "Save"

### **6. Copy Your New Number:**
Example: `+18005551234`

---

## **STEP 2: Add to Environment Variables**

### **Vercel (Production):**
1. Go to: https://vercel.com/i360is-projects/cloud-greet-website/settings/environment-variables
2. Add new variable:
   - **Key:** `TELYNX_PHONE_NUMBER`
   - **Value:** `+18005551234` (your new toll-free number)
   - **Environments:** Check all 3 boxes
   - Click **Save**

3. Add another variable:
   - **Key:** `NOTIFICATION_PHONE`
   - **Value:** `+17372960092` (your personal phone)
   - **Environments:** Check all 3 boxes
   - Click **Save**

### **Local (.env.local):**
Add these lines:
```bash
TELYNX_PHONE_NUMBER=+18005551234
NOTIFICATION_PHONE=+17372960092
```

---

## **STEP 3: Test Notifications**

Once you add those variables and tell me, I'll:
1. Deploy with the new configuration
2. Send you a test SMS
3. Verify all notification types work

---

## **NOTIFICATION TYPES THAT WILL WORK:**

### **1. New Client Signup**
```
🎉 NEW CLIENT: ABC Painting (john@abcpainting.com) signed up for CloudGreet
Time: Oct 9, 2:30 PM
```

### **2. New Appointment Booked**
```
📅 NEW BOOKING: John Smith - Interior Painting on Oct 15 at 2:00 PM
Time: Oct 9, 2:35 PM
```

### **3. System Errors**
```
⚠️ SYSTEM ERROR: Database connection failed
Time: Oct 9, 2:40 PM
```

### **4. Payment Received**
```
💰 PAYMENT: $250 received from ABC Painting
Time: Oct 9, 2:45 PM
```

### **5. Payment Failed**
```
❌ PAYMENT FAILED: ABC Painting - Card declined
Time: Oct 9, 2:50 PM
```

---

## **ONCE YOU HAVE THE NUMBER:**

Just tell me:
- "I bought +18005551234"

And I'll:
1. Add it to your config
2. Deploy
3. Send you a test message
4. Verify everything works

**This will take 5 minutes total.** 🚀

