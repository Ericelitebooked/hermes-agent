# RoofAvenger — Email & Video Delivery System

**Last updated:** 2026-09-16
**Scope:** Prospect notification, welcome email, video hosting, spam prevention

---

## Problem: Getting Video to Prospects Without Spam Filtering

**Naive approach:** Embed video in welcome email
- **Problem:** External video embeds in cold emails trigger spam filters (Gmail, Outlook, corporate email)
- **Result:** Email lands in spam, prospect never sees video

**Solution:** Video on a landing page, linked from email
- Prospect clicks Cal.com booking link in email
- Lands on a page they already chose to visit (reduces spam suspicion)
- Video embedded on that landing page
- They watch → book call on the same page

This keeps video delivery out of email filters entirely.

---

## Complete Flow

```
1. Prospect submits Base44 form
   ↓
2. Webhook hits /api/prospects
   ↓
3. [YOU] Notification email (simple, plain text)
   Subject: "New prospect: [Company Name]"
   Body: Company, owner, phone, current challenge
   ↓
4. [PROSPECT] Welcome email (from Resend)
   Subject: "Thanks [Owner Name] — here's how it works"
   Body: 
     - Intro copy (why they should care)
     - Cal.com booking link (prominent CTA)
     - Brief mention of video: "Click above to book, then watch a 90-second demo"
   ↓
5. Prospect clicks Cal.com link
   ↓
6. [Cal.com landing page] Shows:
     - Video embedded (plays on page load or on click)
     - Brief copy about what they'll see
     - Booking form (pre-filled from form submission data)
   ↓
7. Prospect watches video + books call
```

---

## System Components

### 1. Notification Email (Hermes → You)

**Trigger:** POST to `/api/prospects` from Base44 form

**What to build:** Add this to the `/api/prospects` endpoint (in `src/routes/webhook.js`):

```javascript
// After logging prospect to sheet, send notification to owner
const sendNotificationEmail = async (prospectData) => {
  // Pseudocode — implement via Resend API
  await resend.emails.send({
    from: 'leads@roofavenger.com',
    to: process.env.OWNER_EMAIL,
    subject: `New prospect: ${prospectData.companyName}`,
    html: `
      <h2>New Prospect Signup</h2>
      <p><strong>Company:</strong> ${prospectData.companyName}</p>
      <p><strong>Owner:</strong> ${prospectData.ownerName}</p>
      <p><strong>Phone:</strong> ${prospectData.phone}</p>
      <p><strong>Challenge:</strong> ${prospectData.currentChallenge}</p>
      <p><strong>Location:</strong> ${prospectData.cityState}</p>
      <p><a href="https://your-ghl-sub-account.com/prospects">View in dashboard</a></p>
    `
  });
};
```

**Setup needed:**
- [ ] `OWNER_EMAIL` in `.env` (your email)
- [ ] Resend API key already configured (for prospect form endpoint)

---

### 2. Welcome Email (Hermes → Prospect)

**Trigger:** Same `/api/prospects` endpoint

**What to build:** Another email in the same endpoint:

```javascript
const sendWelcomeEmail = async (prospectData) => {
  // This email goes to the prospect, not you
  await resend.emails.send({
    from: 'team@roofavenger.com',
    to: prospectData.email,
    subject: `Thanks ${prospectData.ownerName} — here's how it works`,
    html: `
      <h1>Thanks for Your Interest, ${prospectData.ownerName}</h1>
      
      <p>We know your biggest challenge is:</p>
      <blockquote>"${prospectData.currentChallenge}"</blockquote>
      
      <p>Watch a quick 90-second demo of exactly how we solve this, then grab a time that works for you.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://lead-agent.srv948101.hstgr.cloud/demo?prospect=${prospectData.phone}"
           style="background-color: #e8622c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Watch Demo & Book a Call
        </a>
      </p>
      
      <p>The demo will show you exactly how our AI answers your leads in seconds and books appointments automatically.</p>
      
      <p>Thanks,<br/>
      The RoofAvenger Team</p>
    `
  });
};
```

**Key details:**
- Plain HTML (no embedded video)
- Link goes to a demo landing page (built in next section)
- Link includes `?prospect=<phone>` to pre-fill booking form
- Call-to-action is the Cal.com booking, not watching video

---

### 3. Demo Landing Page (Cal.com + Video Embed)

**URL:** `https://lead-agent.srv948101.hstgr.cloud/demo`

**What to build:** A simple page that:
1. Displays Video 1 embedded
2. Has Cal.com booking form below/beside it
3. Pre-fills prospect name/email/phone from URL params

**Pseudocode (Node/Express route):**

```javascript
app.get('/demo', (req, res) => {
  const prospectPhone = req.query.prospect || '';
  
  // Query Prospects sheet to get name/email from phone
  const prospect = await googleSheets.getProspectByPhone(prospectPhone);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RoofAvenger Demo</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        video { width: 100%; border-radius: 8px; }
        .booking { border-left: 1px solid #eee; padding-left: 40px; }
        h2 { margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div>
          <h2>How RoofAvenger Works</h2>
          <video width="100%" controls style="border-radius: 8px;">
            <source src="https://your-video-link.com/roofavenger-demo-v1.mp4" type="video/mp4">
          </video>
          <p><strong>Video 1: Speed to Lead</strong><br/>
          Leads answered in seconds, qualified instantly, appointments booked automatically.</p>
        </div>
        
        <div class="booking">
          <h2>Ready to See It In Action?</h2>
          <p>Book a 20-minute strategy call and we'll show you how this would work for your roofing business.</p>
          
          <!-- Cal.com embedded booking form -->
          <iframe src="https://cal.com/roofavenger/20min?name=${prospect.ownerName || ''}&email=${prospect.email || ''}&phone=${prospect.phone || ''}" 
                  style="width: 100%; height: 600px; border: none; border-radius: 8px;"></iframe>
        </div>
      </div>
    </body>
    </html>
  `);
});
```

**Setup needed:**
- [ ] Hosted video URL (Vimeo/YouTube, unlisted)
- [ ] Cal.com API key to embed booking form
- [ ] Optional: Google Sheets query to pre-fill prospect data from phone number

---

## Video Hosting Options

### Option A: Vimeo (Recommended)
- Cost: $240/year (Pro plan)
- Pros: Unlisted videos, professional, no ads, good video quality
- Cons: Paid
- Setup: Create account → upload video as "Unlisted" → get embed code

### Option B: YouTube (Free)
- Cost: Free
- Pros: Free, good delivery
- Cons: Shows YouTube branding, others can find via search (even if unlisted)
- Setup: Upload as "Unlisted" → get embed code

**Recommendation: Vimeo** if you want full control and professionalism. YouTube if you want free.

---

## Spam Prevention Checklist

- [ ] **From address:** Use domain email (team@roofavenger.com) not a Gmail account
- [ ] **SPF/DKIM:** Configure DNS records so Resend can send from your domain
  - Resend provides SPF/DKIM values — add to your DNS
  - Check: https://www.mxtoolbox.com/spf.aspx
- [ ] **Subject line:** Avoid spam triggers ("FREE!", "Act now!", "Limited time")
  - Safe: "Thanks [Name] — here's how it works"
  - Risky: "FREE ROOFING QUOTES NOW!!!"
- [ ] **Link safety:** Use tracking link, or plain URL (no shortened URL that hides destination)
  - Safe: `https://lead-agent.srv948101.hstgr.cloud/demo`
  - Risky: `https://bit.ly/abc123` (hidden destination)
- [ ] **Plain text:** Email is plain HTML, no embedded video/images from external CDNs
- [ ] **Unsubscribe:** Include footer: "This email was sent because you signed up at roofavenger.com. [Unsubscribe link]"
  - Resend handles this automatically if configured

---

## Email Templates (Copy)

### Notification Email (To You)
```
Subject: New prospect: [Company Name]

---

Company: [Company Name]
Owner: [Owner Name]
Phone: [Phone]
Email: [Email]
Location: [City/State]
Challenge: [Current Challenge]
Services: [Services Offered]

---

View in GHL: [Link to prospects dashboard]
```

### Welcome Email (To Prospect)
```
Subject: Thanks [Owner Name] — here's how it works

Hi [Owner Name],

Thanks for reaching out about RoofAvenger.

I know you're dealing with this:
"[Current Challenge]"

We built RoofAvenger specifically for roofing companies in your situation. 
Here's what happens when a lead comes in:

[WATCH DEMO BUTTON]

Click above to book a time, then watch a quick 90-second demo of exactly how we handle your leads.

The demo will show you:
- How our AI answers calls in seconds (not hours)
- How it qualifies leads automatically
- How it books appointments directly to your calendar

No site visits. No waiting. No back-and-forth with homeowners.

Looking forward to showing you,
The RoofAvenger Team

---

P.S. If you have any questions before the call, just reply to this email.
```

---

## Implementation Roadmap

### Phase 1: Build Email System (This week)
- [ ] Add notification email logic to `/api/prospects` endpoint
- [ ] Add welcome email logic to same endpoint
- [ ] Test with real prospect submission
- [ ] Verify emails are not landing in spam (test with Gmail, Outlook)

### Phase 2: Create Demo Landing Page (This week)
- [ ] Build `/demo` route in Hermes
- [ ] Embed video (once recorded and hosted)
- [ ] Embed Cal.com booking form
- [ ] Test end-to-end: prospect submits form → gets email → clicks link → sees video → books call

### Phase 3: Record & Host Video 1 (This week)
- [ ] Record Video 1 per `ROOFAVENGER_DEMO_VIDEO_SCRIPT.md`
- [ ] Upload to Vimeo (unlisted)
- [ ] Get embed code
- [ ] Paste into `/demo` landing page

### Phase 4: Test Full Flow (This week)
- [ ] Submit test prospect form
- [ ] Check: you get notification email
- [ ] Check: prospect gets welcome email (check spam folder)
- [ ] Check: prospect clicks link → sees demo page
- [ ] Check: video plays
- [ ] Check: booking form pre-fills correctly
- [ ] Book a test call to confirm flow

---

## Open Questions

1. **Domain email** — what's your domain? (roofavenger.com, or something else?) Needed for SPF/DKIM setup
2. **Video hosting** — Vimeo or YouTube?
3. **Cal.com iframe vs. redirect** — embed booking form on same page (iframe), or link to Cal.com directly?
4. **Unsubscribe** — should prospects be able to opt out of future emails, or is this a one-time welcome only?
