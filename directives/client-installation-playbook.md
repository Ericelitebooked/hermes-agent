# Client Installation Playbook — Hermes Lead Agent

This is the authoritative SOP for standing up a new client instance of the Hermes Lead Agent (AI lead qualifier: form → score → Google Sheets → voice call → Cal.com booking). It supersedes `base44-form-setup.md`, which is outdated.

**Who this is for:** whoever installs this next — future you, or an agent reading this cold with no memory of today's session. Read this whole file before touching anything. Every step below encodes a real failure we hit and fixed on 2026-09-14/15 setting up "RoofAvenger" for a roofing niche. Skipping steps will reproduce those exact bugs.

**How to use this doc:** follow steps in order. Each has a time estimate for planning, and a "Verify" line — do not move to the next step until Verify passes. At the end there's a Pre-Completion Checklist that must ALL pass before telling a client "it's done." At the very end there's a Time Log table — fill it in for every install so we build real data on install speed over time.

---

## 0. Architecture (30 sec read)

```
Client-branded Base44 form (public URL)
    ↓ POST webhook (JSON, needs CORS)
Node/Express app on VPS (/api/leads)
    ↓
Claude Haiku scores lead (1-10, Hot/Warm/Cold)
    ↓
Google Sheets logs the row (19 columns)
    ↓ (if Hot/Warm)
Twilio calls the lead → TwiML flow (/voice/*) → ElevenLabs speaks, Twilio Gather listens
    ↓ (if they want to book)
Cal.com books the appointment
```

Files that matter:
- `src/config.js` — reads `.env`
- `src/routes/webhook.js` — `/api/leads`, CORS headers live here
- `src/routes/voice.js` — the call flow state machine (`/voice/start` → `/problem` → `/schedule` → `/confirm`)
- `src/services/leadScorer.js` — Claude scoring
- `src/services/googleSheets.js` — Sheets logging
- `src/services/elevenLabs.js` — TTS
- `src/services/calcom.js` — booking
- `.env` — lives ONLY on the VPS, never committed (see `.gitignore`)

---

## 1. Prerequisites Checklist (~15 min to gather, do this before the client call)

Get these from the client or your own accounts BEFORE starting:

- [ ] VPS with Docker + docker-compose already running (this playbook assumes one exists — see Hostinger VPS panel)
- [ ] A subdomain pointed at the VPS with SSL (e.g. `lead-agent.CLIENTDOMAIN.com`), reverse-proxied via Traefik (already configured on our Hostinger boxes)
- [ ] GitHub repo access (this repo, or a fork per client)
- [ ] Anthropic API key (`ANTHROPIC_API_KEY`)
- [ ] ElevenLabs API key + Voice ID (`ELEVEN_API_KEY`, `ELEVEN_VOICE_ID`)
- [ ] Twilio Account SID, Auth Token, and a phone number (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- [ ] Cal.com API key, username, event type ID (`CAL_API_KEY`, `CAL_USERNAME`, `CAL_EVENT_TYPE_ID`)
- [ ] A Google Cloud service account with Sheets API enabled — email + private key (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`)
- [ ] Base44 account (client or agency-owned)
- [ ] Client's brand name, primary color, accent color, and niche (roofing, plumbing, HVAC, etc.)

---

## 2. Google Sheets Setup (~10 min)

**Do this before deploying the app** — the app will silently fail to log leads otherwise (it won't crash, it just logs an error and keeps going).

1. Create a new Google Sheet, name it `<ClientName>-Leads` or similar.
2. **Confirm the tab name at the bottom-left is literally `Sheet1`** (default name). The code writes to range `Sheet1!A:S` by name — if the tab is renamed, logging breaks with `Requested entity was not found`, and this is easy to miss since the error doesn't say "wrong tab name."
3. Paste this into cell A1 (auto-fills all 19 columns):
   ```
   Timestamp	Name	Phone	Email	Service Needed	Lead Score	Tier	Urgency	Est Job Value	Call Made	Owner Alerted	Key Signals	Follow Up Note	Problem Description	Inspection Booked	Call Notes	Follow-up Date	Next Action	Contact Attempt #
   ```
4. Bold row 1.
5. Click **Share** → add the service account email (e.g. `xxx@xxx.iam.gserviceaccount.com`) with **Editor** access. Not Viewer — Editor.
6. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_PART/edit`

**Verify:** the ID copied has no surrounding whitespace or quotes when you paste it into `.env` in the next step (see the duplicate-key trap below).

---

## 3. VPS App Deployment (~15 min first time, ~5 min for updates)

### 3.1 Find or clone the app directory

Don't assume it's in `~/`. On our current box it lives at `/docker/lead-agent/`. If unsure:
```bash
find / -name "docker-compose.prod.yml" 2>/dev/null
```
Ignore any hits under `/var/lib/docker/overlay2/` — those are internal image layers, not the live directory.

### 3.2 Write `.env`

Use `.env.example` (if present) as a template, or create fresh. **Known trap:** it is very easy to end up with a duplicated key like this if you script `.env` generation or copy-paste carelessly:
```
GOOGLE_SHEET_ID=GOOGLE_SHEET_ID=1QsHLLZhcsUUZfqBA29e_aI_JL_Xe9GZn9sgqBvvDhco
```
This parses as a valid env line (the value becomes `GOOGLE_SHEET_ID=1QsHLL...`), so nothing crashes — it just makes every Sheets API call fail with `Requested entity was not found`, which looks like a permissions problem and wastes debugging time. **After writing `.env`, always run:**
```bash
grep -nE "^([A-Z_]+)=\1=" /path/to/.env
```
This must print nothing. If it prints a line, fix that key.

**Critical value: `SERVER_URL`.** This must point to THIS app's own public domain (e.g. `https://lead-agent.CLIENTDOMAIN.com`), not any other service running on the same VPS. If the box also hosts an unrelated management agent or other app on a similar-looking subdomain, it is easy to paste the wrong one. A wrong `SERVER_URL` doesn't break the webhook — it breaks the **voice call**, because Twilio is told to fetch TwiML instructions from the wrong app entirely, and the caller hears "an application error has occurred." Double-check this value points at the app you just deployed.

**Verify:**
```bash
grep SERVER_URL .env
```
The domain shown must resolve to this app (test with `curl https://THAT_DOMAIN/health` — should return `{"status":"ok",...}`).

### 3.3 Build and start

```bash
cd /docker/lead-agent
docker compose -f docker-compose.prod.yml up -d --build
```

**Do not use `docker compose restart` after a code or `.env` change.** `restart` reuses the already-built image — it will NOT pick up new source files or `.env` edits if the Dockerfile bakes them in via `COPY . .` (it does, in this project). Every deploy after a `git pull` or `.env` edit must be `up -d --build`.

**Verify:**
```bash
docker ps
```
Container should show `Up` and a recent start time.

### 3.4 Confirm the running code matches the latest commit

```bash
git log -1 --oneline
```
Compare against `git log -1 --oneline` on your local machine / GitHub. If they don't match, `git pull` then rebuild (§3.3) before doing anything else.

---

## 4. Webhook Health Check (~5 min)

Before touching Base44, confirm the API itself works in isolation.

```bash
curl -X POST https://lead-agent.CLIENTDOMAIN.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+1234567890","email":"test@test.com","serviceNeeded":"Test","problemDescription":"Test","city":"Test City"}'
```

**Verify:** JSON response with `"success":true`. If this fails, do not proceed — fix it here first. A curl failure with no CORS involved at all means the problem is basic connectivity/DNS/container health, not CORS.

**Important:** a successful plain `curl` does **not** prove CORS works — `curl` doesn't enforce CORS, only browsers do. This step only confirms the server itself is reachable and functioning. CORS gets verified separately in §6.

---

## 5. Base44 Form Setup (~20 min)

### 5.1 The build prompt

Paste this into Base44 (fill in the bracketed placeholders for the client):

```
Create a beautiful lead capture form for "[CLIENT_BRAND_NAME]" - an AI [NICHE, e.g. roofing]
lead qualification program.

Title: "Get Qualified [NICHE] Leads with [CLIENT_BRAND_NAME]"
Subtitle: "Join contractors getting 5-15 AI-qualified leads per week"

Fields:
1. Company Name (required) - placeholder "Your company name"
2. Owner Name (required) - placeholder "Your first and last name"
3. Phone Number (required) - placeholder "+1 (214) 555-1234"
4. Email (optional) - placeholder "your@email.com"
5. Services You Offer (multiselect, required) - options: [list client's actual service categories]
6. Current Challenge (textarea, required) - placeholder "e.g., We get 2-3 leads per week and need more qualified ones"
7. Preferred Contact Time (dropdown, optional) - options: Mornings, Afternoons, Evenings, Anytime
8. City/State (required) - placeholder "e.g., Dallas, TX"

Also add:
- Caller history lookup by phone number: when a phone number that has submitted before
  submits again, show "This caller has submitted N times before" with prior submission
  dates and services.

Design: Professional, bold, premium. Use [PRIMARY_COLOR_HEX] and [ACCENT_COLOR_HEX].
Button text: "Become a [SHORT_BRAND_NAME]".

No landing page, just the form. Clean and beautiful.
```

### 5.2 Add success/failure feedback (do this — don't skip)

Ask Base44 to show a visible status after submit:
```
Add a status message after form submission:
- Green "✅ Lead forwarded to AI agent successfully." when the webhook POST succeeds
- Red "⚠️ Saved to CRM, but the AI agent didn't receive it. Check webhook/CORS." when it fails
```
Without this, a broken webhook fails silently and looks like "nothing happened" — this was the single biggest time-sink during initial setup.

### 5.3 Follow-up fields (post-call, not form-submission data)

Ask Base44 to add these fields to the internal CRM/Caller History view only (NOT sent via webhook — they're filled in after a call):
- Call Notes (textarea)
- Follow-up Date (date picker)
- Next Action (text)
- Contact Attempt # (number, ideally auto-incrementing per phone number)

These map to the last 4 columns in the Google Sheet, but are written manually by whoever handles follow-up, not by the webhook payload.

---

## 6. Webhook + CORS Wiring (~15 min — this is where most time gets lost if skipped)

### 6.1 Why this matters

Base44's form runs in the visitor's browser. A browser-to-different-domain POST request is subject to CORS. If the API doesn't return the right headers, the **browser blocks the response even though the server processed it correctly** — Base44 will report a network error, and a plain `curl` test (§4) will look totally fine, which is confusing if you don't know to expect this split.

### 6.2 What must be true in the code

`src/routes/webhook.js` must:
1. Handle `OPTIONS /leads` (the browser's CORS preflight) and return:
   - `Access-Control-Allow-Origin: <the exact Base44 form origin, e.g. https://client-name.base44.app>`
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type`
2. Return the same `Access-Control-Allow-Origin` header on the actual `POST /leads` response too (not just OPTIONS).

If the client's Base44 form URL changes (new client, new subdomain), **this origin string must be updated in the code** and redeployed (§3.3). It is hardcoded, not wildcarded, by design (don't loosen it to `*` without thinking about it).

### 6.3 Configure the webhook in Base44

- Name: `<Client> Lead Qualifier`
- URL: `https://lead-agent.CLIENTDOMAIN.com/api/leads`
- Method: `POST`
- Content-Type: `application/json`
- Field mapping (Base44 field → JSON key):
  ```
  Owner Name           → name
  Phone Number         → phone
  Email                → email
  Services You Offer   → serviceNeeded   (comma-joined string if multiselect)
  Current Challenge    → problemDescription
  City/State           → city
  ```
  Do NOT include Company Name or the post-call follow-up fields in the webhook payload — they're not read by the API.

### 6.4 Verify CORS specifically (not just plain curl)

```bash
curl -X OPTIONS https://lead-agent.CLIENTDOMAIN.com/api/leads \
  -H "Origin: https://CLIENT_FORM.base44.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```
**Verify:** response headers include `access-control-allow-origin: https://CLIENT_FORM.base44.app` (must match exactly, including https and no trailing slash). If missing, the preflight is failing and the browser will block every submission even though curl-without-Origin looked fine.

### 6.5 Publish the form

Click Publish/Go Live in Base44, get the public URL. **This is also the moment to confirm the CORS origin in the code (§6.2) matches this exact published URL** — if you configured CORS before publishing and the URL changed, redeploy.

---

## 7. End-to-End Test (~10 min)

Use urgent, high-intent test language — a vague "just testing" submission will legitimately score Cold and won't trigger a call, which looks like a bug but isn't:

```
Company Name: Test Co
Owner Name: [your name]
Phone: [your real phone]
Services: [pick 1-2]
Current Challenge: "Storm damage last night, actively leaking into the attic,
                     insurance already approved the claim, need someone ASAP."
City/State: [client's city]
```

Submit, then watch for, in order:
1. Base44 shows the green success message (§5.2) — confirms CORS + webhook reachability
2. New row in Google Sheets within ~5 seconds
3. Phone rings within ~15-20 seconds
4. Answer — greeting plays, describe a problem, confirm it responds to what you said (not silence)
5. It asks for a day/time — give one it doesn't have availability for, or decline its offer — confirm it asks again instead of hanging up
6. If you do book, confirm a Cal.com booking actually appears in the client's Cal.com calendar

Pull logs alongside this:
```bash
docker logs --tail 100 <container_name>
```
Look for `[API]`, `[Scorer]`, `[GoogleSheets]`, `[Twilio]`, `[Voice]`, `[Cal.com]` lines — a clean run shows no `Error` lines.

---

## 8. Troubleshooting Reference

| Symptom | Root Cause | Fix |
|---|---|---|
| Base44 shows "AI agent didn't receive it" / network error on submit, but `curl` to the same endpoint works fine | Browser CORS block — missing/wrong `Access-Control-Allow-Origin` | §6.2–6.4. Check the OPTIONS preflight specifically, not just POST. |
| Code changes deployed (`git pull` succeeded) but old behavior persists | Ran `docker compose restart` instead of `up -d --build` — old image still running | `docker compose -f docker-compose.prod.yml up -d --build`, then confirm with `git log -1 --oneline` inside the running container's source dir |
| Google Sheets: `Requested entity was not found` | Usually one of: (a) duplicated `KEY=KEY=value` in `.env`, (b) Sheet ID mismatch, (c) sheet tab isn't named exactly `Sheet1`, (d) service account not shared as Editor | Run `grep -nE "^([A-Z_]+)=\1=" .env`; compare Sheet ID to the URL; check tab name; check Share dialog |
| Voice call says "an application error has occurred" immediately | `SERVER_URL` in `.env` points to the wrong app/domain, so Twilio fetches TwiML from somewhere that doesn't implement `/voice/start` | Fix `SERVER_URL` (§3.2), rebuild, redial |
| Lead scoring always returns the same generic fallback (score 5, "Incomplete scoring") | Invalid/deprecated Claude model name in `leadScorer.js` → API returns 404 → code falls back silently | Check `docker logs` for `[Scorer] Error scoring lead: ... 404`; update the `model:` field to a current valid model ID |
| Caller speaks during the call, gets total silence, call drops after a pause | Twilio `<Gather>` defaults to DTMF-only. Missing `input: 'speech'` on the gather config means spoken responses are never captured | Add `input: 'speech'` (or `['speech','dtmf']` where digit-press is also valid) to every `twiml.gather()` call in `voice.js` |
| ElevenLabs voice fails, call falls back to robotic Twilio `<Say>` voice | ElevenLabs API error (bad voice ID, bad API key, account restriction) — original code only logged the generic axios status, hiding the real reason | Check `docker logs` for `[ElevenLabs] Error generating speech: <detail>` (now includes the actual response body); verify `ELEVEN_API_KEY` / `ELEVEN_VOICE_ID` in `.env` |
| Bot offers a time slot, caller declines or no slots exist, bot says "try another day/time" then immediately hangs up | The TwiML played the message but never opened another `<Gather>` to listen for the retry — it just hung up | Already fixed in `voice.js` (`/voice/schedule` and `/voice/confirm` now loop back into a new gather, capped at `MAX_RESCHEDULE_ATTEMPTS`) — if this regresses, check those two routes didn't lose their retry branch |
| Nothing in Google Sheets AND no call, but form clearly submitted | Lead scored Cold (below the Hot/Warm call threshold) — this may be correct behavior, not a bug | Check `docker logs` for `[API] Lead not qualified for immediate call (score: X, tier: Cold)`. Re-test with urgent language (§7) to confirm the pipeline itself works |
| VPS app directory not where you expect | Multiple apps/services can live on one VPS under different paths | `find / -name "docker-compose.prod.yml" 2>/dev/null`, ignore `/var/lib/docker/overlay2/` hits |

---

## 9. Pre-Completion Checklist

Do not tell a client "it's done" until every box is checked, with a fresh end-to-end test (§7) run after the LAST code or config change — not one from earlier in the install:

- [ ] `/health` endpoint returns `{"status":"ok"}`
- [ ] `git log -1 --oneline` on the VPS matches the latest commit on GitHub
- [ ] `.env` has no duplicated keys (`grep -nE "^([A-Z_]+)=\1=" .env` prints nothing)
- [ ] `SERVER_URL` resolves to this app, verified via curl
- [ ] Google Sheet tab is named exactly `Sheet1`, has all 19 column headers, service account has Editor access
- [ ] Base44 form is published with a live public URL
- [ ] Base44 shows the green success indicator on a real test submission
- [ ] CORS preflight verified with `curl -X OPTIONS ... -H "Origin: ..."` showing the correct `access-control-allow-origin`
- [ ] A fresh urgent-language test lead: appears in Sheets, triggers a call within ~20 seconds, the call actually listens and responds to speech (not silence)
- [ ] Declining a time offer or hitting no availability is confirmed to loop back and ask again, not hang up
- [ ] A test booking actually appears on the client's Cal.com calendar
- [ ] `docker logs --tail 100` from the full test run shows zero unhandled `Error` lines
- [ ] Client has been shown where to find: the Google Sheet, the Base44 form URL, and how to reach you if something breaks

---

## 10. Time Log

Track every install here (or copy this table into a per-client note) so we can see whether install speed is actually improving as this playbook gets better.

| Client | Date | §1-2 Prereqs+Sheets | §3 Deploy | §4-6 Webhook+CORS | §7 E2E Test | §8 Troubleshooting time | Total | Notes |
|---|---|---|---|---|---|---|---|---|
| RoofAvenger (internal test) | 2026-09-14/15 | ~10 min | ~20 min | ~90 min (first-time CORS + 6 stacked bugs found live) | ~15 min | included above | ~2.5-3 hrs | First install ever — every bug above was found and fixed live during this run. All fixes are now in the codebase, so a repeat install should NOT hit these same issues. Expect §4-6 to drop to ~20-30 min once CORS origin is just a config value to set per client. |
| | | | | | | | | |

**Target for next install:** under 90 minutes total, since every bug found in row 1 is now fixed in code and documented above. If a NEW client install takes longer than that, something new broke — add it to §8 when found.
