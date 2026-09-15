> **Superseded** — see `directives/client-installation-playbook.md` for the current, complete install + troubleshooting SOP (includes CORS, the exact Base44 prompt, and every real bug found in production). Kept here for reference only.

# Base44 Form Setup Guide

## Overview
This guide walks you through creating a lead capture form in Base44 that connects directly to your Hermes AI Lead Qualifier system.

**Form Endpoint**: `https://lead-agent.srv948101.hstgr.cloud/api/leads`

---

## Step 1: Log Into Base44

1. Go to: **https://app.base44.com**
2. Log in with your account
3. You'll see your dashboard

---

## Step 2: Create a New Form

1. Click **"Create"** or **"New Form"** button
2. Choose **"Blank Form"** or **"Start from Template"**
3. Name it: `Roofing Lead Capture` (or similar)
4. Click **"Create"**

You're now in the form builder.

---

## Step 3: Add Form Fields

### Field 1: Full Name
1. Click **"Add Field"**
2. **Label**: `Full Name`
3. **Type**: `Text Input`
4. **Required**: ✅ Yes
5. **Placeholder**: `e.g., John Smith`
6. Click **"Add"**

### Field 2: Phone Number
1. Click **"Add Field"**
2. **Label**: `Phone Number`
3. **Type**: `Phone` (if available) or `Text Input`
4. **Required**: ✅ Yes
5. **Placeholder**: `e.g., +1 201 555 1234`
6. **Hint**: `Include country code (e.g., +1 for US)`
7. Click **"Add"**

### Field 3: Email
1. Click **"Add Field"**
2. **Label**: `Email`
3. **Type**: `Email Input`
4. **Required**: ❌ No
5. **Placeholder**: `your@email.com`
6. Click **"Add"**

### Field 4: Service Type
1. Click **"Add Field"**
2. **Label**: `What service do you need?`
3. **Type**: `Dropdown` or `Select`
4. **Required**: ✅ Yes
5. **Options** (add each):
   - Roofing Repair
   - Roof Replacement
   - Gutters & Downspouts
   - Siding
   - Solar Installation
   - HVAC Services
   - General Inspection
   - Other
6. Click **"Add"**

### Field 5: Problem Description
1. Click **"Add Field"**
2. **Label**: `Describe your problem`
3. **Type**: `Textarea` or `Long Text`
4. **Required**: ✅ Yes
5. **Placeholder**: `e.g., "Leak in master bedroom after storm, water stains on ceiling"`
6. **Rows**: `4-5`
7. Click **"Add"**

### Field 6: Location
1. Click **"Add Field"**
2. **Label**: `City/State`
3. **Type**: `Text Input`
4. **Required**: ✅ Yes
5. **Placeholder**: `e.g., Dallas, TX`
6. Click **"Add"**

---

## Step 4: Configure Form Settings

1. Click **"Settings"** or **"Form Settings"** (usually top right)
2. Set:
   - **Form Title**: `Roofing Lead Capture`
   - **Redirect after submit**: (optional) ✅ "Thank you! We'll call you within 5 minutes"
   - **Send confirmation email**: (optional) ✅ Yes

---

## Step 5: Set Up Webhook Integration

1. In form settings, find **"Integrations"** or **"Webhooks"**
2. Click **"Add Integration"** or **"Connect Webhook"**
3. Fill in:
   - **Type**: `Webhook` or `Custom Post Request`
   - **Name**: `Hermes Lead Qualifier`
   - **URL**: `https://lead-agent.srv948101.hstgr.cloud/api/leads`
   - **Method**: `POST`
   - **Content-Type**: `application/json`

4. **Map Fields** (most critical step):
   
   Base44 should show you field mapping. Map like this:
   ```
   Base44 Field          →  API Field
   Full Name            →  name
   Phone Number         →  phone
   Email                →  email
   Service Type         →  serviceNeeded
   Problem Description  →  problemDescription
   City/State           →  city
   ```

   **If Base44 shows a JSON payload editor**, format it as:
   ```json
   {
     "name": "{{Full Name}}",
     "phone": "{{Phone Number}}",
     "email": "{{Email}}",
     "serviceNeeded": "{{What service do you need?}}",
     "problemDescription": "{{Describe your problem}}",
     "city": "{{City/State}}"
   }
   ```

5. Click **"Save"** or **"Enable"**

---

## Step 6: Publish Form

1. Click **"Publish"** or **"Go Live"**
2. You'll get a public form URL:
   ```
   https://app.base44.com/form/your-form-id
   ```
3. Share this URL with leads or embed it on your website

---

## Step 7: Test the Form

### Local Test (Before Going Live)

1. Fill out your form with **test data**:
   ```
   Name: Test Contractor
   Phone: +1 201 555 0123
   Email: test@example.com
   Service: Roofing Repair
   Problem: Leak in attic area
   City: Dallas, TX
   ```

2. **Submit the form**

3. **Check results** in 3 places:

   **A) Google Sheets** (within 30 seconds):
   - Go to your sheet: `https://docs.google.com/spreadsheets/d/1QsHLLZhcsUUZfqBA29e_aI_JL_Xe9GZn9sgqBvvDhco`
   - New row should appear with lead data

   **B) Twilio Call Logs** (within 60 seconds):
   - Go to: `https://console.twilio.com`
   - Check **"Recent Calls"**
   - Should see outbound call to your test phone number

   **C) Hermes Dashboard**:
   - Go to: `https://hermes-agent-qg9w.srv948101.hstgr.cloud/sessions`
   - Check session logs for the lead

---

## Step 8: Troubleshooting

### Form Submits But No Data Appears

**Check these in order**:

1. **Webhook URL is exact**: 
   ```
   https://lead-agent.srv948101.hstgr.cloud/api/leads
   ```
   (no trailing slash, exact spelling)

2. **Method is POST** (not GET)

3. **Content-Type is application/json**

4. **Field mapping is correct**:
   - `name` ≠ `fullName` (exact spelling)
   - `phone` ≠ `phoneNumber`
   - All 6 fields mapped

5. **Test via curl** (from VPS terminal):
   ```bash
   curl -X POST https://lead-agent.srv948101.hstgr.cloud/api/leads \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test",
       "phone": "+1 201 555 0123",
       "email": "test@example.com",
       "serviceNeeded": "Roofing",
       "problemDescription": "Test problem",
       "city": "Dallas"
     }'
   ```

---

## Step 9: Customize & Expand

Once working, you can:

✅ Add more service types to dropdown  
✅ Add urgency field (dropdown: High/Medium/Low)  
✅ Add photo upload (for before/after)  
✅ Add "Preferred contact time" field  
✅ Add "Budget range" field  

---

## Live Checklist

- [ ] Form created in Base44
- [ ] 6 fields added
- [ ] Webhook configured
- [ ] Field mapping verified
- [ ] Test lead submitted
- [ ] Data appears in Google Sheets
- [ ] Call was attempted
- [ ] Form published & shareable URL works
- [ ] Ready to send to contractors!

---

## Your Form is Ready! 🚀

Once published, leads will automatically:
1. Fill your form
2. Hit `/api/leads` endpoint
3. Get scored by Claude AI
4. Log to Google Sheets
5. Receive Twilio call (if qualified)
6. Get Cal.com appointment offer

**No manual work. Fully automated.** ✅

