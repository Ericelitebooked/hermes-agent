# Troubleshooting Guide

## `/health` Returns HTML (Hermes Panel) Instead of JSON

**Symptom**: Curl returns `<html>...</html>` instead of `{"status":"ok",...}`

**Cause**: Traefik hasn't finished routing the request yet

**Fix**:
1. Check `docker-compose.yml`: Verify Host() matches your domain EXACTLY (with backticks)
2. Verify all four PathPrefix entries are present: `/webhook`, `/voice`, `/audio`, `/health`
3. Verify `<YOUR_HERMES_NETWORK>` is correct
4. Run: `docker compose up -d`
5. Wait 20-30 seconds
6. Retry: `curl -s https://<YOUR_AGENT_DOMAIN>/health`

---

## Phone Never Rings

**Symptom**: Call initiated in logs, but phone doesn't ring

**Cause #1: Twilio Phone Number Format**
- Both `TWILIO_PHONE_NUMBER` and lead's phone must start with `+` and include country code
- Example: `+1 2015551234` (with or without spaces is fine)

**Cause #2: Trial Account Limitations**
- Trial Twilio accounts can ONLY call verified numbers
- Solution: Either upgrade OR verify the number you're testing with
- Upgrade at: twilio.com → Billing → Upgrade Account

**Cause #3: Wrong Phone Number in Typeform**
- Lead submits form without country code
- Twilio rejects it silently

**Debug**:
```bash
docker compose logs --tail 30 | grep -i "twilio\|error\|call"
```

---

## Voice is Robotic / ENOENT src/audio/...mp3

**Symptom**: Call works but voice sounds like robot, OR app crashes with audio error

**Cause**: Audio folder is missing or ElevenLabs is not configured

**Fix**:
1. On server: `mkdir -p /docker/lead-app/app/src/audio`
2. Restart: `docker compose restart`
3. Verify ElevenLabs setup:
   - `ELEVEN_API_KEY` is set
   - `ELEVEN_VOICE_ID` is set (not empty)
   - ElevenLabs account is on Starter plan (free plan can't use API)

---

## Google Sheets Not Updating — "The Caller Does Not Have Permission"

**Symptom**: Logs show permission error, no row appears in sheet

**Cause #1: Sheet Not Shared**
- Service account email doesn't have access
- Most common cause!

**Fix**:
1. Open sheet: sheets.google.com
2. Share → Paste `GOOGLE_SERVICE_ACCOUNT_EMAIL` → Editor → Uncheck "Notify" → Share
3. Retry test

**Cause #2: Wrong Sheet ID**
- You copied the full URL instead of just the ID
- Correct: `1A2B3C4D5E6F7...` (just the middle part)
- Wrong: `https://docs.google.com/spreadsheets/d/1A2B3C4D.../edit`

**Cause #3: Private Key Malformed**
- Key must be on ONE line, in quotes, with literal `\n` sequences
- Wrong: Spreading across multiple lines OR removing `\n`
- Correct: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

**Debug**:
```bash
# Check the .env file on server
grep GOOGLE app/.env | head -2
```

---

## Cal.com Booking Fails — 400 Bad Request

**Symptom**: Booking attempt returns 400, logs show error details

**Common Errors**:

1. **"Attendee must have at least one contact method"**
   - Attendee has no email AND no phone
   - Fix: Ensure lead submitted phone AND/OR email

2. **"eventTypeId is not a valid UUID"**
   - You passed eventTypeId as a string instead of Number
   - This is handled by code (should not happen)

3. **"No availability"**
   - Cal.com has no open slots on the requested date
   - Fix: Open cal.com, verify slots exist for test date

4. **"Wrong timezone"**
   - Slots offered in wrong timezone
   - Fix: Verify `TIMEZONE` in `.env` matches your real zone

**Debug**:
```bash
# Logs show Cal.com's exact error response
docker compose logs --tail 20 | grep -A5 "Cal.com"
```

---

## Wrong Time Announced / Booked

**Symptom**: Agent says "3:30 PM" but cal shows different time

**Cause**: Timezone mismatch

**Fix**:
1. Set `TIMEZONE` in `.env` to your real timezone (e.g., `Asia/Dubai`)
2. Verify both:
   - Spoken time (voice.js)
   - Cal.com attendee timezone (calcom.js)
3. Restart: `docker compose restart`

**Valid Timezones**: America/New_York, Europe/London, Asia/Dubai, etc.

---

## Container Shows "RESTARTING" in `docker compose ps`

**Symptom**: Run `docker compose ps` and see status "Restarting"

**Cause**: App is crash-looping (usually bad config or missing env var)

**Fix**:
```bash
docker compose logs --tail 30
# Read the error carefully
# Common: Missing API key, bad private key, port already in use

# Edit .env and fix the issue
nano app/.env

# Restart
docker compose restart

# Check again
docker compose logs --tail 10
```

---

## Terminal Drops You Inside a Container (root@55a1...)

**Symptom**: Prompt shows `root@55a1...` instead of `root@srv1728628`

**Cause**: You typed `docker exec -it` or similar, entering the container

**Fix**: Type `exit` ONCE to return to host
- Do NOT type `exit` again (that logs you out of SSH entirely)

---

## Large Paste Gets Stuck / Echoes Back

**Symptom**: Paste a multi-line block and it hangs or repeats

**Cause**: Web terminals choke on large pastes

**Fix**: Use `nano` for file contents instead
```bash
nano docker-compose.yml
# Then paste the file contents (nano handles it better)
# Ctrl+O → Enter → Ctrl+X
```

For single-line commands, they're fine to paste directly.

---

## How to Check Logs in Real Time

```bash
# Watch logs as they happen
cd /docker/lead-app
docker compose logs -f

# Last 50 lines only
docker compose logs --tail 50

# Filter for errors only
docker compose logs --tail 100 | grep -i error

# Stop watching
# Press Ctrl+C
```

---

## Restart the App

```bash
cd /docker/lead-app
docker compose restart
```

This stops and starts the container. It does NOT delete anything.
