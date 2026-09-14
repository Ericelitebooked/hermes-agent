# Base44 Form Integration

## Overview

The lead agent now accepts direct JSON POST requests from Base44 (or any web form), eliminating Typeform dependencies.

**Endpoint**: `POST /api/leads`  
**Response**: JSON with lead score, tier, and call status

---

## Form Configuration

### Base44 Form Fields

Configure your Base44 form with these field names (case-sensitive):

1. **name** (text) - Full name of lead
2. **phone** (phone) - Phone number with country code (+1234567890)
3. **email** (email) - Email address
4. **serviceNeeded** (text/select) - Service type (e.g., "Roofing services")
5. **problemDescription** (textarea) - Description of the issue
6. **city** (text) - City/location

Example Base44 form:
```
Full Name: [text input]
Phone: [phone input]
Email: [email input]
What service do you need?: [select dropdown]
Describe your problem: [textarea]
What city are you in?: [text input]
```

### Form Submission Setup

1. Go to your Base44 form settings
2. Find "Integrations" or "Webhooks"
3. Select "Custom Webhook" or "POST Request"
4. Enter endpoint URL:
   ```
   https://<YOUR_AGENT_DOMAIN>/api/leads
   ```
5. Set method to: `POST`
6. Set content type to: `application/json`
7. Map form fields to JSON:
   ```json
   {
     "name": "{{Full Name}}",
     "phone": "{{Phone}}",
     "email": "{{Email}}",
     "serviceNeeded": "{{Service Type}}",
     "problemDescription": "{{Problem Description}}",
     "city": "{{City}}"
   }
   ```
8. Save and activate

---

## Request Format

### Minimal Request (Required Fields Only)
```bash
curl -X POST https://<YOUR_AGENT_DOMAIN>/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "James Michael",
    "phone": "+1 201 555 1234"
  }'
```

### Complete Request (All Fields)
```bash
curl -X POST https://<YOUR_AGENT_DOMAIN>/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "James Michael",
    "phone": "+1 201 555 1234",
    "email": "james@example.com",
    "serviceNeeded": "Roofing services",
    "problemDescription": "My roof is leaking and damaged after a storm",
    "city": "Dallas"
  }'
```

---

## Response Format

### Success (200 OK)
```json
{
  "success": true,
  "leadId": "lead-1694522400000",
  "name": "James Michael",
  "score": 8,
  "tier": "Hot",
  "callInitiated": true,
  "message": "Call initiated for James Michael"
}
```

### Partial Success (200 OK) - Below Call Threshold
```json
{
  "success": true,
  "leadId": "lead-1694522400001",
  "name": "Jane Smith",
  "score": 4,
  "tier": "Cold",
  "callInitiated": false,
  "message": "Lead qualified but below call threshold (score: 4)"
}
```

### Error (400 Bad Request) - Missing Required Fields
```json
{
  "error": "Missing required fields: name, phone"
}
```

### Error (500 Internal Server Error)
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Data Flow

```
Base44 Form Submission
    ↓ (HTTP POST)
POST /api/leads
    ↓
Parse JSON { name, phone, email, serviceNeeded, problemDescription, city }
    ↓
Validate: name & phone required
    ↓
Score with Claude AI (1-10, Hot/Warm/Cold)
    ↓
Log to Google Sheets (15 columns)
    ↓
IF score >= 5 (Hot or Warm) & phone exists:
    ├→ Initiate Twilio call
    │   └→ Lead hears AI voice asking about problem
    └→ Return immediate response
```

---

## Testing the Integration

### Local Test
```bash
# Start the server
npm start

# In another terminal, send a test request
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "phone": "+1 201 555 0123",
    "email": "test@example.com",
    "serviceNeeded": "Roofing",
    "problemDescription": "Roof is leaking",
    "city": "New York"
  }'

# Expected response (if all APIs configured):
# {"success":true,"leadId":"lead-...","name":"Test Lead","score":X,"tier":"...","callInitiated":true/false,...}
```

### Production Test
```bash
curl -X POST https://<YOUR_AGENT_DOMAIN>/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "phone": "+1 201 555 1234",
    "email": "you@example.com",
    "serviceNeeded": "Service Type",
    "problemDescription": "Issue description",
    "city": "Your City"
  }'
```

---

## Logs to Monitor

When a lead is submitted, check these logs:

```bash
docker compose logs -f | grep -E "\[API\]|\[Voice\]"
```

Expected log sequence:
```
[API] Lead submission received
[API] Parsed lead: { name: '...', phone: '...', service: '...', city: '...' }
[API] Lead scored: { score: X, tier: 'Hot/Warm/Cold' }
[API] Lead logged to Google Sheets
[API] Call initiated for ...  (if qualified)
```

---

## Phone Number Format

**Required**: Country code + number  
✅ Correct:
- +1 201 555 1234
- +1-201-555-1234
- +12015551234

❌ Wrong:
- 201 555 1234 (missing country code)
- +1-201-555 (incomplete)

---

## Email Field

**Optional** - The system handles missing email gracefully:
- If provided: Used for Cal.com booking + Google Sheets
- If omitted: Twilio call uses phone number only for contact

---

## Service Type Options

Examples (not exhaustive):
- Roofing services
- Electrical work
- Plumbing services
- HVAC services
- General inspection
- Damage assessment

Anything submitted is accepted and scored by Claude AI.

---

## Troubleshooting

### Lead Not Received
1. Check endpoint URL matches exactly: `https://<YOUR_AGENT_DOMAIN>/api/leads`
2. Verify method is `POST` (not GET)
3. Verify Content-Type is `application/json`
4. Check logs: `docker compose logs --tail 20 | grep API`

### Leads Not Being Called
1. Verify phone number includes country code (+1, +44, etc.)
2. Verify Twilio account has credits and verified numbers
3. Check score: only Hot (8-10) or Warm (5-7) trigger calls
4. Check logs for: `[API] Call initiated` or `[API] Lead not qualified`

### API Returns 400 Error
- Ensure `name` and `phone` are present in request
- Both are required; all others are optional
- Check spelling: case-sensitive field names

### Leads Appear in Google Sheets But No Call
- Score might be below 5 (Cold tier)
- Twilio credentials might be invalid
- Phone number format might be wrong
- Check logs: `[API] Lead not qualified` vs. `[API] Call initiated`

---

## Differences from Typeform

| Aspect | Typeform | Base44/Direct JSON |
|---|---|---|
| **Setup** | Configure in Typeform → Webhooks | Configure in Base44 → Integrations |
| **Signature Verification** | Required (security) | Not needed (form is yours) |
| **Field Mapping** | Automatic (complex) | Explicit JSON keys |
| **Parsing** | Complex (many answer types) | Simple (direct JSON) |
| **Flexibility** | Locked to Typeform structure | Any form that sends JSON |
| **Cost** | Typeform subscription | None (free) |

---

## Security Notes

- The `/api/leads` endpoint is **public** (no authentication)
- Consider adding rate limiting if SPAM occurs
- Form is on your domain (Base44), so you control security
- Recommend: HTTPS only (automatically enforced by Traefik)

To add rate limiting later:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/leads', limiter);
```

---

## Next Steps

1. ✅ Update Base44 form with 6 fields
2. ✅ Get webhook endpoint from Hostinger: `https://<YOUR_AGENT_DOMAIN>`
3. ✅ Configure Base44 integration with `/api/leads` endpoint
4. ✅ Test with curl command above
5. ✅ Submit a real form
6. ✅ Verify call is made and Google Sheets updated
7. ✅ Go live!
