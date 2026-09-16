# RoofAvenger — Two-Video Demo Strategy

**Last updated:** 2026-09-16
**Scope:** Pre-recorded demo videos showing the core value prop to prospects + upsell layer

---

## The Two Videos

### Video 1: "Speed to Lead" (Core MVP)
**What happens:** Homeowner submits lead → AI calls in seconds → qualifies them → books inspection

**Who sees it:** All prospects (included in Growth tier)

**Why it matters:** Roofer's pain = "I answer calls too slowly and lose jobs to faster competitors"

**Duration:** ~90 seconds (existing script: `ROOFAVENGER_DEMO_VIDEO_SCRIPT.md`)

---

### Video 2: "Speed to Quote" (Upsell Feature)
**What happens:** Same AI that qualified the lead now asks property questions → generates preliminary quote using Base44 estimator → pulls aerial photo from Google Maps → gathers photos/measurements → books follow-up call with roofer to discuss

**Who sees it:** Scale tier prospects + upsell demonstration during sales call

**Why it matters:** Roofer's deeper pain = "Even if I answer fast, I spend 30 min on phone + site visit + office time building a quote. Homeowner either hires someone else in the meantime, or gets annoyed by back-and-forth"

**Duration:** ~120 seconds

**Flow in video:**
1. Lead is qualified (end of Video 1)
2. AI transitions: "Hey, I grabbed some info about your property — mind if we give you a quick second opinion on pricing?"
3. Homeowner says yes (or implies it)
4. AI asks: roof size, material type, any damage history, preferred timeline
5. **[Cut to system processing]** Google Maps pulls aerial view, Base44 quote estimator calculates price
6. AI says: "Based on what you told me, here's a ballpark estimate: $5,200–$7,400 for a full replacement. I've also grabbed satellite photos of your roof. [System shows aerial screenshot] A roofer will go over all this with you in detail — let me book that call."
7. Cal.com books follow-up inspection call
8. **[End screen]** Shows the follow-up call booked on roofer's calendar, aerial photo, preliminary quote PDF

---

## Technical Integration (Video 2 Only)

Video 2 requires the Hermes voice agent to call into your existing infrastructure:

| Component | Already Built? | What it does |
|---|---|---|
| Base44 quote estimator | ✅ Yes (user built) | Takes roof size + material → outputs price range |
| Google Maps API | ✅ Yes (need to wire) | Pulls satellite imagery of address, shows aerial view |
| Hermes voice flow | ⚠️ Partial | Can ask questions; needs to trigger quote estimator |
| Quote generation logic | ✅ Yes (in Base44) | Async or sync trigger from voice call |
| Cal.com booking | ✅ Yes (existing) | Books follow-up inspection call |

**New wiring needed:**
1. Hermes voice agent → triggers Base44 quote estimator (API call with roof details)
2. Hermes voice agent → calls Google Maps API with homeowner's address → retrieves aerial photo
3. Store preliminary quote + photo temporarily (attach to Cal.com event or email to roofer)
4. Roofer sees quote + photo before/during follow-up call

---

## Positioning Shift: "Speed to Quote"

Current pitch (Video 1 only):
> "Leads answered in seconds, not hours"

Expanded pitch (Video 1 + Video 2):
> "Leads answered in seconds AND preliminary quotes generated while you work — no site visits or data entry until they say yes"

This reframes the value from "faster callbacks" → "faster, fuller information" → "roofer can focus on the job, not admin"

---

## Prospect Experience: Two Demo Videos

**Pre-call email sequence:**

Day 0 (Welcome):
- Intro copy + Video 1 link (lead qualification demo)
- Cal.com booking link for sales call

Day 3 (Reminder):
- "Here's what you'd see in the first 2 minutes with a new lead..."
- Video 1 embedded or linked again

Day 7 (Last touch):
- "One more thing — we also handle quotes automatically..."
- Video 2 link (upsell demo for Scale tier)
- Cal.com link

**During sales call:**
- You walk them through Video 1 (they've likely seen it, but now you can answer questions)
- If interested in more: play Video 2, discuss Scale tier upsell
- If high-intent: offer 7-day free trial on their own site (live demo, not pre-recorded)

---

## Recording Checklist

### Video 1 (Already scripted)
- [ ] Script: `ROOFAVENGER_DEMO_VIDEO_SCRIPT.md`
- [ ] Recording: screen capture of actual MVP running
- [ ] Cuts: form submit → scoring → call log → Cal.com booking
- [ ] Runtime: ~90 seconds
- [ ] Host: Vercel, Vimeo, or YouTube (unlisted)

### Video 2 (New)
- [ ] Script: draft below (or refine)
- [ ] Recording: screen capture of Hermes + Base44 + Google Maps together
- [ ] Live elements needed:
  - [ ] Actual address to demo (or mock address with satellite view available)
  - [ ] Base44 quote estimator running live
  - [ ] Google Maps API pulling real aerial photo
  - [ ] Cal.com booking page
- [ ] Runtime: ~120 seconds
- [ ] Host: same as Video 1

---

## Video 2 Script (Draft)

**[SCREEN: End of Video 1, lead is qualified]**

> "The lead is booked. But here's the thing — while you're wrapping up that other job, here's what our system does next."

**[SCREEN: AI continues talking to homeowner]**

AI: "Hey, I grabbed some basic info about your property while we talked. Want a ballpark on pricing before your inspection? Shouldn't take long."

Homeowner: "Sure, yeah."

**[SCREEN: system shows it's gathering info — quick montage]**

AI: "Perfect. Just a couple quick questions — what's your roof material? Asphalt shingles, metal, or something else?"

Homeowner: "Asphalt, been up for about 15 years."

AI: "Got it. And roughly how many square feet is your roof?"

Homeowner: "I'd say around 2,500."

**[SCREEN: cut to system processing — Google Maps aerial view appears, quote estimator calculating]**

AI: "Cool. Based on what you told me, here's what a replacement would run — somewhere between $5,200 and $7,400 depending on the exact condition. I've also grabbed a satellite photo of your roof."

**[SCREEN: aerial photo displayed, zoomed on roof]**

AI: "A licensed roofer will go over all this in detail and give you a real estimate. Let me get that scheduled for you."

**[SCREEN: Cal.com calendar, inspection call booked]**

AI: "You're all set for Thursday at 2 PM. They've got your photos and this preliminary estimate, so it's going to be a quick, focused conversation. You won't have to explain everything twice."

**[END SCREEN: shows booked call on roofer's calendar + preliminary quote PDF + aerial photo]**

> "No site visit until they're ready. No back-and-forth. The roofer walks in with 90% of the information already gathered."

---

## Pricing Tiers

- **Growth ($1,499/mo)**: Video 1 only (lead qualification + booking)
- **Scale ($2,499/mo)**: Video 1 + Video 2 (qualification + quote generation)
- **Upsell path**: Growth customer interested in quotes → offer Scale upgrade or separate $499/mo "Quote Pro" add-on

---

## Production Timeline

1. **Record Video 1**: This week (using existing script + MVP)
2. **Set up Video 2 recording environment**: Prepare test address, Google Maps screenshot, Base44 estimator, Cal.com — same week
3. **Record Video 2**: Following week (more complex, multiple system integrations to capture)
4. **Edit both**: Ensure they flow smoothly, add music/graphics if needed
5. **Host**: Upload to Vimeo (unlisted) or YouTube (unlisted) + embed in landing page

---

## Open Questions

1. **Quote estimator logic** — is it already live in Base44, or still in development? (User said "built in base44")
2. **Google Maps API key** — already have one, or need to set up?
3. **Aerial photo delivery** — show in video only, or also email it to roofer + homeowner?
4. **Quote PDF** — auto-generate a PDF of the estimate to attach to the follow-up call email?
5. **Homeowner expectations** — does the preliminary AI quote set them up for sticker shock if roofer quotes higher after site visit?
