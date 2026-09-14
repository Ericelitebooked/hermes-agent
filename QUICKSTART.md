# 🚀 Quick Start Guide - Hermes AI Lead Agent

## Project Status: ✅ COMPLETE

All code, configs, and directives are built. You have everything needed to deploy a $10K AI lead qualifier agent.

---

## What You Have

```
hermes-agent/
├── YThermesTranscript.md                          ← Full video transcript (verified)
├── QUICKSTART.md                                  ← This file
├── src/                                           ← Complete Node.js + Express app
│   ├── index.js                                   ✅ Server startup
│   ├── config.js                                  ✅ ENV var management
│   ├── routes/webhook.js                          ✅ Typeform → lead pipeline
│   ├── routes/voice.js                            ✅ Twilio IVR (4-step flow)
│   └── services/
│       ├── leadScorer.js                          ✅ Claude AI scoring
│       ├── twilioCall.js                          ✅ Outbound calling
│       ├── elevenLabs.js                          ✅ Text-to-speech
│       ├── calcom.js                              ✅ Calendar booking
│       └── googleSheets.js                        ✅ Lead logging
├── directives/                                    ← SOPs (3-layer architecture)
│   ├── system-architecture.md                     ✅ Overview
│   ├── deployment.md                              ✅ Hostinger setup
│   ├── troubleshooting.md                         ✅ Common issues
│   └── transcript-implementation-mapping.md       ✅ What matches transcript
├── .env                                           ← Your secrets (placeholder)
├── .env.example                                   ← Template with descriptions
├── package.json                                   ← Dependencies
├── docker-compose.yml                             ← Hostinger deployment config
└── .gitignore                                     ← Protects secrets

```

---

## Next Steps (In Order)

### Step 1: Gather API Keys (30 min)
Follow the guide in the PDF or transcript to get:
- ✅ ANTHROPIC_API_KEY (platform.anthropic.com)
- ✅ ELEVEN_API_KEY + ELEVEN_VOICE_ID (elevenlabs.io)
- ✅ TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER (twilio.com)
- ✅ CAL_API_KEY + CAL_USERNAME + CAL_EVENT_TYPE_ID (cal.com)
- ✅ GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY + GOOGLE_SHEET_ID (Google Cloud)
- ✅ TYPEFORM_SECRET (typeform.com)

See: `.env.example` for descriptions of each.

### Step 2: Fill in .env (5 min)
```bash
# Open .env in VS Code
# Copy values from Step 1 into .env (one by one)
# Save
# Verify: grep -o '^[A-Z_]*=' .env  (shows names only, not secrets)
```

### Step 3: Create a Google Sheet (2 min)
1. Go to sheets.google.com
2. Create new sheet, name it "lead-agent"
3. Share with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor** (critical!)
4. Copy Sheet ID to `.env`

### Step 4: Create a Typeform (5 min)
1. Go to typeform.com
2. Add fields: Name, Phone, Email, Service Needed, Problem, Property Location, When do you need this
3. Copy Webhook Secret to `.env`

### Step 5: Create Cal.com Event (3 min)
1. Go to cal.com
2. Create event "Free Property Inspection" (30 min)
3. Add 3-4 open slots for test day
4. Copy Event Type ID + username to `.env`

### Step 6: Local Test (10 min)
```bash
# Install dependencies
npm install

# Start server
npm start

# Open another terminal, test health check
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 7: Push to GitHub (5 min)
```bash
git init
git add .
git status  # Verify .env is NOT listed
git commit -m "Initial lead agent"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### Step 8: Deploy to Hostinger (20 min)
Follow: `directives/deployment.md`
- Connect to Hostinger host terminal
- Clone code from GitHub
- Create docker-compose.yml with your domain
- Start container: `docker compose up -d`
- Verify: `curl https://<YOUR_DOMAIN>/health`

### Step 9: Connect Typeform Webhook (2 min)
1. typeform.com → Your form → Connect → Webhooks → Add
2. URL: `https://<YOUR_DOMAIN>/webhook/typeform`
3. Toggle ON

### Step 10: Run First Test (15 min)
1. Watch logs: `docker compose logs -f`
2. Fill out Typeform on another device/browser
3. Wait for phone to ring
4. Verify Google Sheets has new row
5. Check logs for the full flow

---

## Key Files to Understand

**Configuration:**
- `.env` → All your secrets (edit this with real API keys)
- `.env.example` → Template with descriptions
- `src/config.js` → Reads and validates env vars

**Application Entry:**
- `src/index.js` → Express server, audio folder guarantee, routes

**Data Flow:**
1. Lead → `POST /webhook/typeform` (webhook.js)
2. Score → Claude AI (leadScorer.js)
3. Call → Twilio (twilioCall.js)
4. Voice → ElevenLabs or Twilio Say (elevenLabs.js)
5. Book → Cal.com (calcom.js)
6. Log → Google Sheets (googleSheets.js)
7. IVR → 4-step conversation (voice.js)

**Deployment:**
- `docker-compose.yml` → Hostinger container config
- `.gitignore` → Protects .env from GitHub

**Documentation:**
- `directives/system-architecture.md` → Overview
- `directives/deployment.md` → Step-by-step Hostinger setup
- `directives/troubleshooting.md` → Common issues & fixes
- `directives/transcript-implementation-mapping.md` → What matches the video
- `YThermesTranscript.md` → Full video transcript

---

## Critical Gotchas (From Transcript)

1. **Google Sheet Not Updating?**
   - You MUST share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**
   - This is the #1 mistake

2. **Audio Folder Missing?**
   - Server automatically creates `src/audio` on startup
   - If deployment fails, manually: `mkdir -p /docker/lead-app/app/src/audio`

3. **Phone Never Rings?**
   - Both TWILIO_PHONE_NUMBER and lead's phone must start with + and country code
   - Trial Twilio: can only call verified numbers (upgrade or verify)

4. **Cal.com Booking Fails?**
   - Ensure 3-4 open slots exist on test day
   - eventTypeId must be a NUMBER (code handles this)
   - Attendee must have email OR phone (never both empty)

5. **Wrong Time Announced?**
   - TIMEZONE must match your real zone (e.g., Asia/Dubai)
   - Used for both voice and Cal.com booking

6. **Private Key Not Working?**
   - Must be ONE line, with quotes, with literal \n sequences
   - Example: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

---

## Testing Checklist

Before calling for real, verify locally:

```bash
# 1. All env vars present
grep -c '=' .env
# Should show 16 (all keys filled)

# 2. Server starts
npm start
# Look for: "[STARTUP] Hermes Lead Agent listening on port 3000"

# 3. Health check works
curl http://localhost:3000/health
# Should return JSON with "status":"ok"

# 4. Google Sheets accessible
# (Test requires real API key, skip if not ready)

# 5. Dependencies installed
ls node_modules | grep -E 'express|twilio|axios' | head -3
# Should show packages
```

---

## Selling This ($10K+)

**What to tell prospects:**
- "Calls your leads within 5 minutes (100x more likely to reach)"
- "AI qualification + auto-booking (saves 10+ hours/week)"
- "Runs 24/7 (no missed leads at 2am, weekends, holidays)"
- "Done-for-you setup (we handle all integrations)"

**Pricing:**
- $10,000 setup + $500/mo retainer (conservative)
- Or: $3-20K depending on lead value (aggressive)

**Replaces:**
- Receptionist (~$3.5K/mo) + CRM (~$200/mo) + Scheduler (~$100/mo) = ~$45.6K/year

---

## Support

If something breaks:

1. **Read the logs**
   ```bash
   docker compose logs --tail 50 | grep -i error
   ```

2. **Check directives/troubleshooting.md**
   - Covers all common issues

3. **Verify .env**
   ```bash
   grep -E 'ANTHROPIC|ELEVEN|TWILIO|CAL|GOOGLE' .env | head -3
   ```

4. **Check the transcript**
   - Video shows exact steps at each stage
   - Reference: `YThermesTranscript.md`

---

## Architecture (Your 3-Layer Setup)

### Layer 1: Directives (Markdown SOPs)
- Read: `directives/system-architecture.md`
- Read: `directives/deployment.md`
- Update when you discover new constraints

### Layer 2: Orchestration (You making decisions)
- Follow the quick steps above
- Use Claude Code for any modifications
- Self-correct using troubleshooting guide

### Layer 3: Execution (Deterministic code)
- `src/` contains all logic
- Each service handles one integration
- Errors are logged with context

---

## One More Thing

**The "Money Moment" (from transcript):**
> The silence between form submission and the phone ringing is the most powerful moment of the demo. Don't talk over it.

When you test, pause there. It's why people pay $10K.

---

**You're ready. Build it. 🚀**
