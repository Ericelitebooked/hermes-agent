# Migration Guide: Typeform → Base44 Form

## Summary of Changes

You now have a clean, dependency-free lead intake endpoint that accepts direct JSON from any web form (Base44, custom forms, etc.).

---

## What Changed

### ✅ Removed
- `POST /webhook/typeform` endpoint
- Typeform webhook signature verification
- Typeform-specific field mapping logic
- `TYPEFORM_SECRET` environment variable

### ✅ Added
- `POST /api/leads` endpoint
- Direct JSON payload parsing
- Base44 form integration guide
- `directives/base44-integration.md` with setup instructions

### ✅ Updated
- `src/routes/webhook.js` → Rewrote with Base44-compatible logic
- `src/index.js` → Changed route mount from `/webhook` → `/api`
- `docker-compose.yml` → Updated Traefik routing from `/webhook` → `/api`
- `.env.example` → Removed `TYPEFORM_SECRET`
- `.env` → Removed `TYPEFORM_SECRET`

---

## New Endpoint Specification

### Request
```
POST /api/leads
Content-Type: application/json

{
  "name": "James Michael",
  "phone": "+1 201 555 1234",
  "email": "james@example.com",
  "serviceNeeded": "Roofing services",
  "problemDescription": "My roof is leaking",
  "city": "Dallas"
}
```

### Required Fields
- `name` (string) - Lead's full name
- `phone` (string) - Phone with country code (+1234567890)

### Optional Fields
- `email` (string)
- `serviceNeeded` (string)
- `problemDescription` (string)
- `city` (string)

### Response
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

---

## Data Flow (Unchanged Except for Input)

```
Base44 Form Submission
    ↓ (JSON POST to /api/leads)
Parse { name, phone, email, serviceNeeded, problemDescription, city }
    ↓
Validate: name & phone required
    ↓
Score with Claude AI (1-10, Hot/Warm/Cold) ✅ SAME
    ↓
Log to Google Sheets (15 columns) ✅ SAME
    ↓
IF Hot or Warm & phone exists:
    ├→ Initiate Twilio call ✅ SAME
    │   ├→ ElevenLabs text-to-speech ✅ SAME
    │   ├→ Cal.com availability check ✅ SAME
    │   └→ Cal.com booking ✅ SAME
    └→ Return response
```

**All lead scoring and voice logic is identical. Only the input method changed.**

---

## Configuration in Base44

### Step 1: Set Up Form Fields

Create a form with 6 fields:

| Field Name | Type | Required? | Example |
|---|---|---|---|
| name | Text | Yes | James Michael |
| phone | Phone | Yes | +1 201 555 1234 |
| email | Email | No | james@example.com |
| serviceNeeded | Text/Select | No | Roofing services |
| problemDescription | Textarea | No | My roof is leaking |
| city | Text | No | Dallas |

### Step 2: Configure Webhook Integration

1. In Base44 form settings
2. Find "Integrations" or "Webhooks" or "Custom Actions"
3. Create new webhook with:
   - **URL**: `https://<YOUR_AGENT_DOMAIN>/api/leads`
   - **Method**: `POST`
   - **Content-Type**: `application/json`
   - **Payload**: (see below)

### Step 3: Map Fields to JSON

Configure Base44 to send this JSON structure on form submission:

```json
{
  "name": "{{form.name}}",
  "phone": "{{form.phone}}",
  "email": "{{form.email}}",
  "serviceNeeded": "{{form.serviceNeeded}}",
  "problemDescription": "{{form.problemDescription}}",
  "city": "{{form.city}}"
}
```

(Exact variable names depend on your Base44 setup; check their documentation)

---

## Testing the New Endpoint

### Local Test
```bash
# Terminal 1: Start the server
npm start

# Terminal 2: Send test request
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+1 201 555 0123",
    "email": "test@example.com",
    "serviceNeeded": "Test Service",
    "problemDescription": "Test problem",
    "city": "Test City"
  }'

# Expected response:
# {"success":true,"leadId":"lead-...","name":"Test User","score":X,"tier":"...","callInitiated":true/false,...}
```

### Production Test
```bash
# After deployment to Hostinger
curl -X POST https://<YOUR_AGENT_DOMAIN>/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "phone": "+1 201 555 1234",
    "email": "you@example.com",
    "serviceNeeded": "Your Service",
    "problemDescription": "Your problem",
    "city": "Your City"
  }'
```

---

## Deployment Updates

### For Hostinger Deployment

The `docker-compose.yml` has been updated:

**Old**:
```yaml
PathPrefix(`/webhook`)
```

**New**:
```yaml
PathPrefix(`/api`)
```

This is already done in your current file. When you redeploy:

```bash
docker compose down
docker compose up -d
```

Traefik will automatically route `/api/leads` requests to your app.

---

## Environment Variables

### Removed
- ~~`TYPEFORM_SECRET`~~ (no longer needed)

### Still Required
- `ANTHROPIC_API_KEY` (Claude AI scoring)
- `ELEVEN_API_KEY` + `ELEVEN_VOICE_ID` (Voice)
- `TWILIO_*` (Phone calls)
- `CAL_*` (Calendar booking)
- `GOOGLE_*` (Logging)
- `SERVER_URL` (Callback URLs)
- `TIMEZONE` (Time displays)

**Your `.env` now has 14 variables instead of 15.**

---

## Logs

Watch for these new log messages:

```bash
docker compose logs -f | grep "\[API\]"
```

Example output:
```
[API] Lead submission received
[API] Parsed lead: { name: 'James', phone: '+1...', service: 'Roofing', city: 'Dallas' }
[API] Lead scored: { score: 8, tier: 'Hot' }
[API] Lead logged to Google Sheets
[API] Call initiated for James Michael
```

---

## Backwards Compatibility

### What Still Works
- All lead scoring logic ✅
- All voice call logic ✅
- All calendar booking logic ✅
- All Google Sheets logging ✅
- All Twilio integration ✅
- All ElevenLabs integration ✅
- All error handling ✅

### What's Different
- Input format (JSON instead of Typeform webhook structure)
- No signature verification (you control the form)
- Simpler request/response cycle

---

## Troubleshooting

### API Returns 400: "Missing required fields"
- Ensure your JSON has `name` and `phone` fields
- Check spelling: these are case-sensitive

### API Returns 500: "Error processing lead"
- Check logs: `docker compose logs --tail 20`
- Verify Claude AI, Twilio, Cal.com credentials
- Ensure Google Sheets is shared with service account

### Form Not Triggering Webhook
- Verify webhook URL is correct: `https://<YOUR_AGENT_DOMAIN>/api/leads`
- Verify method is `POST`, not GET
- Verify Content-Type is `application/json`
- Test with curl command above

### Leads Not Being Called
- Check phone number format (+country_code format)
- Check lead score: only Hot/Warm trigger calls
- Check Twilio logs: `docker compose logs | grep Twilio`

---

## Next Steps

1. ✅ Review this guide
2. ✅ Read `directives/base44-integration.md` for detailed Base44 setup
3. ⏳ Configure Base44 form with 6 fields
4. ⏳ Set up webhook in Base44 → `https://<YOUR_AGENT_DOMAIN>/api/leads`
5. ⏳ Test with curl (local)
6. ⏳ Submit a real form
7. ⏳ Verify call is made and Google Sheets logged
8. ⏳ Go live!

---

## Questions?

- **Base44 setup**: See `directives/base44-integration.md`
- **Full data flow**: See `directives/system-architecture.md`
- **Troubleshooting**: See `directives/troubleshooting.md`
- **Testing**: Use curl examples above

---

**You now have a clean, flexible lead intake system independent of Typeform. 🎯**
