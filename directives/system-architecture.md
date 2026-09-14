# Hermes AI Lead Qualifier - System Architecture

## Overview
A speed-to-lead automation system that scores leads from Typeform, calls them via Twilio with an AI voice (ElevenLabs), books appointments via Cal.com, and logs everything to Google Sheets.

## Data Flow

```
Lead Submits Typeform
        ↓
[Webhook] → POST /webhook/typeform
        ↓
[Claude AI] → Score lead (1-10, Hot/Warm/Cold)
        ↓
IF Hot or Warm AND phone exists:
        ├→ [Twilio] → Initiate outbound call
        │   ├→ [ElevenLabs] → Generate voice responses
        │   └→ [Cal.com] → Check availability & book
        └→ [Google Sheets] → Log all lead data
```

## Environment Variables
See `.env.example` for the complete list with descriptions.

## API Dependencies
1. **Anthropic** - Claude for lead scoring
2. **Twilio** - Voice calling (outbound)
3. **ElevenLabs** - AI voice generation
4. **Cal.com** - Calendar availability and booking
5. **Google Sheets** - Lead logging
6. **Typeform** - Lead intake form

## Call Flow States
- `/voice/start` - Greeting, ask problem
- `/voice/problem` - Store problem, ask date/time
- `/voice/schedule` - Show Cal.com slots, confirm booking
- `/voice/confirm` - Book and confirm
- `/voice/status` - Twilio status callback

## Critical Requirements
- Audio folder must exist (even if empty, for deployment)
- Private key must be properly escaped with `\n` sequences
- eventTypeId sent to Cal.com must be a NUMBER, not string
- Attendee object must have contact method (email OR phone)
- All times must use process.env.TIMEZONE
- Service account must have Sheet Editor access
