# RoofAvenger — Prospect Journey Automation (Sales Ops Pipeline)

**Last updated:** 2026-09-16
**Scope:** Full prospect lifecycle from form submission → booked customer, with automation at each step

---

## Complete Prospect Journey Map

```
Form Submit (Base44)
    ↓
[Notification] — Email alert to you
    ↓
[Welcome Sequence] — Email + demo video link + one-page leave-behind PDF
    ↓
[Follow-up Loop] — Automated emails (Day 1, 3, 7)
    ↓
[Booking] — Cal.com link in email
    ↓
[Sales Call] — Fathom auto-record + transcribe
    ↓
[Proposal Generation] — Claude reads transcript → generates custom proposal
    ↓
[Proposal Delivery] — Automated email with pricing/ROI based on *their* call
    ↓
[Status Tracking] — Move in Prospects sheet (New → Contacted → Booked → Closed)
    ↓
[Onboarding] — GHL sub-account setup, Base44 form creation, training call
```

---

## Integration Points & Tools

| Step | Tool | Purpose |
|---|---|---|
| Form capture | Base44 | Lead intake |
| Prospect storage | Google Sheets (Prospects tab) | CRM-lite, status tracking |
| Notifications | Email (Resend API) | Alert you to new submissions |
| Demo video | Hosted link (Vercel or CDN) | Shareable video asset |
| Leave-behind | PDF (generated or static) | One-pager for prospects |
| Email sequence | n8n workflows | Scheduled follow-ups |
| Booking link | Cal.com API | Self-service call scheduling |
| Call recording | Fathom | Auto-record sales calls |
| Transcript | Fathom API | Pull call transcript for analysis |
| Proposal generation | Claude API | Turn transcript → custom proposal |
| Proposal delivery | Resend API | Email prospect with generated proposal |
| Status updates | Google Sheets API | Move prospect through pipeline stages |

---

## Orchestration Layer: n8n as the Glue

**Recommendation:** Use **n8n** as the central orchestration engine, with Claude as the intelligence layer.

### Why n8n (not Claude/Hermes directly)

| Layer | Job | Why not that tool alone |
|---|---|---|
| **n8n (orchestration)** | Schedule, sequence, route, retry, error-handle | Claude is stateless; Hermes is built for lead-qualification, not scheduling |
| **Claude (intelligence)** | Proposal generation, transcript analysis, smart routing | Can't schedule tasks, track state, handle retries, trigger webhooks reliably |
| **Hermes (homeowner pipeline)** | AI lead qualification & voice calls | Already handles its domain well; adding sales-ops logic would bloat it |

### n8n Workflow: Prospect Lifecycle

```
Webhook Trigger
  ↓ (prospect form submission from Base44)
  ↓
1. Parse prospect data
2. Log to Prospects sheet
3. Send notification email to you
4. Queue welcome email sequence (Day 0, 3, 7)
5. Wait for Cal.com booking (webhook from Cal.com when they book)
6. Retrieve Fathom transcript (after call ends)
7. Call Claude API: transcript → proposal JSON
8. Render proposal + send via email
9. Update Prospects sheet status to "Booked"
10. Trigger onboarding workflow
```

### Claude's Role (n8n Node)

n8n has a native Claude node. Each time needed:

```
Input: Fathom transcript + prospect name/company/challenge
Prompt: "Generate a personalized proposal email for this prospect based on their call. Include pricing (Starter $997, Growth $1,499, Scale $2,499), ROI estimate based on their lead volume, and next steps."
Output: JSON {proposalText, recommendedTier, roiCalculation}
```

---

## Implementation Sequence (Priority Order)

### Phase 1: Notification + Delivery (Week 1)
- [ ] Email notification when prospect submits (n8n webhook → Resend)
- [ ] Demo video recorded and hosted
- [ ] One-page leave-behind PDF created
- [ ] Welcome email template (with video link + PDF attachment)

### Phase 2: Email Sequence (Week 2)
- [ ] n8n workflow: welcome email (Day 0)
- [ ] n8n workflow: follow-up email (Day 3)
- [ ] n8n workflow: last-touch email (Day 7)
- [ ] Cal.com link embedded in all emails

### Phase 3: Call Recording + Proposal (Week 3)
- [ ] Fathom integration on your Cal.com calls
- [ ] n8n: retrieve Fathom transcript post-call
- [ ] Claude prompt: transcript → proposal JSON
- [ ] n8n: render + send proposal email
- [ ] Test end-to-end with real prospect call

### Phase 4: Status Tracking + Onboarding (Week 4)
- [ ] Google Sheets automation: move status as prospects progress
- [ ] Onboarding playbook/checklist (GHL sub-account setup, etc.)
- [ ] Optional: auto-create GHL sub-account via API on purchase

---

## Open Questions Before Building

1. **Demo video** — recorded yet? Needed for Phase 1.
2. **One-page PDF** — static or dynamically generated per prospect?
3. **Proposal format** — email-embedded HTML, PDF attachment, or link to a landing page?
4. **Fathom recording** — will it capture calls on Cal.com directly, or do you also use Zoom/phone?
5. **Pricing tiers in proposal** — always offer all three (Starter/Growth/Scale), or recommend one based on their call?
6. **Onboarding automation** — manual checklist, or actually auto-create GHL sub-accounts via API?

---

## Why NOT These Alternatives

| Tool | Why Not | Notes |
|---|---|---|
| Zapier | Limited Claude integration, pricier at this complexity | n8n is open-source, has better Claude support |
| Hermes (custom API) | Already built for homeowner lead qual., not sales ops | Adding this would bloat its responsibility |
| Grok | Unclear role; not an orchestration tool | Would still need n8n/Zapier as glue anyway |
| Claude alone | Stateless, no scheduling/retries/webhooks | Good for proposal text, bad for "send email on Day 3 at 9am" |
| GHL workflows | Closed-box, hard to integrate Fathom/Claude | Good for roofer CRM, not for your sales pipeline |

---

## Cost Estimate (New Services)

| Service | Est. Cost | Notes |
|---|---|---|
| n8n Cloud | $20–50/mo | Depending on workflow complexity + execution count |
| Fathom | $10/mo | Call recording + transcription |
| Resend (email) | $20/mo or free tier | Depends on volume (free tier ~100 emails/day) |
| Claude API | $5–10/mo | Proposals only, low volume at this stage |
| Cal.com | Already have | No additional cost |
| **Total new monthly** | **~$55–80** | Assuming n8n Cloud mid-tier |

---

## Architectural Diagram

```
┌─────────────────────┐
│   Base44 Form       │
│  (Prospect signup)  │
└──────────┬──────────┘
           │
           ↓
    ┌──────────────┐
    │  n8n Webhook │
    │  (Trigger)   │
    └──────┬───────┘
           │
    ┌──────┴─────────────────────────┬─────────────────────┐
    ↓                                ↓                     ↓
┌─────────────┐           ┌──────────────────┐     ┌──────────────┐
│   Google    │           │  Resend (Email)  │     │  Cal.com     │
│   Sheets    │           │  Notification    │     │  (Booking)   │
│ (Prospect   │           └──────────────────┘     └──────────────┘
│   storage)  │                    ↑                     ↑
└─────────────┘                    │                     │
                            ┌───────┴─────────────────────┘
                            │
                     ┌──────────────────┐
                     │  n8n Workflows   │
                     │  (Orchestration) │
                     └────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
    ┌──────────┐      ┌──────────────┐    ┌────────────────┐
    │ Fathom   │      │ Claude API   │    │ Google Sheets  │
    │ (Call    │      │ (Proposal    │    │ (Status track) │
    │ record)  │      │  generation) │    └────────────────┘
    └────┬─────┘      └──────┬───────┘
         │                   │
         └───────┬───────────┘
                 ↓
          ┌─────────────────┐
          │ Resend (Email   │
          │  Proposal)      │
          └─────────────────┘
```

---

## Next Steps

1. **Decide:** Will you build n8n workflows yourself (learning curve ~2–3 days) or hand it to me to build?
2. **Record demo video** (Phase 1 blocker)
3. **Create one-page PDF** (Phase 1 blocker)
4. **Start Phase 1** once both assets above exist
