const express = require('express');
const twilio = require('twilio');
const config = require('../config');
const { textToSpeech } = require('../services/elevenLabs');
const { getAvailability, bookAppointment } = require('../services/calcom');
const { logLead } = require('../services/googleSheets');

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper: Generate voice response with ElevenLabs fallback
async function generateVoiceMessage(message) {
  try {
    const audioUrl = await textToSpeech(message);
    return audioUrl; // Return URL to Play
  } catch (error) {
    console.error('[Voice] Failed to generate ElevenLabs audio:', error.message);
    return null; // Will trigger fallback to Say
  }
}

// START: Greeting and initial problem inquiry
router.post('/start', async (req, res) => {
  try {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const callerPhone = req.body.Caller;

    console.log(`[Voice/Start] Call started from ${callerPhone}`);

    // Store call context
    if (!global.callContext) global.callContext = {};
    global.callContext[callSid] = {
      callerPhone: callerPhone,
      startTime: new Date(),
    };

    // Greeting message
    const greeting =
      'Hi there! Thank you for reaching out to us. Can you tell me a bit more about the issue you need help with? Please describe your problem.';

    const audioUrl = await generateVoiceMessage(greeting);
    if (audioUrl) {
      twiml.play(audioUrl);
    } else {
      twiml.say(greeting);
    }

    // Gather speech input for 1 minute, then go to /problem
    const gather = twiml.gather({
      numDigits: 0,
      timeout: 60,
      speechTimeout: 'auto',
      action: '/voice/problem',
      method: 'POST',
    });

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('[Voice/Start] Error:', error.message);
    const twiml = new VoiceResponse();
    twiml.say('Sorry, there was an error. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
});

// PROBLEM: Store problem, ask for day/time
router.post('/problem', async (req, res) => {
  try {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const speechInput = req.body.SpeechResult || '';

    console.log(`[Voice/Problem] Speech received: "${speechInput}"`);

    // Store problem in context
    if (!global.callContext) global.callContext = {};
    global.callContext[callSid].problem = speechInput;

    const message =
      'Thank you for providing that information. What day and time work best for you? For example, tomorrow at 2 PM.';

    const audioUrl = await generateVoiceMessage(message);
    if (audioUrl) {
      twiml.play(audioUrl);
    } else {
      twiml.say(message);
    }

    // Gather for day/time
    const gather = twiml.gather({
      numDigits: 0,
      timeout: 60,
      speechTimeout: 'auto',
      action: '/voice/schedule',
      method: 'POST',
    });

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('[Voice/Problem] Error:', error.message);
    const twiml = new VoiceResponse();
    twiml.say('Sorry, I did not catch that. Please try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

// SCHEDULE: Check Cal.com availability and offer slots
router.post('/schedule', async (req, res) => {
  try {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const timeframeInput = req.body.SpeechResult || '';

    console.log(`[Voice/Schedule] Timeframe requested: "${timeframeInput}"`);

    if (!global.callContext) global.callContext = {};
    global.callContext[callSid].timeframe = timeframeInput;

    // Parse date from speech (simplified - assumes "tomorrow" or similar)
    // In production, use a better date parser
    let targetDate = new Date();
    if (timeframeInput.toLowerCase().includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateStr = targetDate.toISOString().split('T')[0];

    // Get availability from Cal.com
    const slots = await getAvailability(dateStr);

    if (slots.length === 0) {
      console.log('[Voice/Schedule] No availability found');
      const noSlotsMsg =
        'Unfortunately, we have no availability on that date. Please try a different day.';
      const audioUrl = await generateVoiceMessage(noSlotsMsg);
      if (audioUrl) {
        twiml.play(audioUrl);
      } else {
        twiml.say(noSlotsMsg);
      }
      twiml.hangup();
    } else {
      // Offer the first available slot
      const firstSlot = slots[0];
      const slotTime = new Date(firstSlot.time);
      const timeStr = slotTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: config.timezone,
      });

      global.callContext[callSid].offeredSlot = firstSlot;

      const offerMsg = `The earliest available time is ${slotTime.toLocaleDateString()} at ${timeStr}. Does that work for you?`;
      const audioUrl = await generateVoiceMessage(offerMsg);
      if (audioUrl) {
        twiml.play(audioUrl);
      } else {
        twiml.say(offerMsg);
      }

      // Gather yes/no
      const gather = twiml.gather({
        numDigits: 1,
        timeout: 30,
        speechTimeout: 'auto',
        action: '/voice/confirm',
        method: 'POST',
      });
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('[Voice/Schedule] Error:', error.message);
    const twiml = new VoiceResponse();
    twiml.say('Sorry, there was an issue checking availability. Please call back later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

// CONFIRM: Book the appointment
router.post('/confirm', async (req, res) => {
  try {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const digit = req.body.Digits || '';
    const speechInput = req.body.SpeechResult || '';

    console.log(`[Voice/Confirm] User response: digit=${digit}, speech="${speechInput}"`);

    if (!global.callContext) global.callContext = {};
    const context = global.callContext[callSid];

    const confirmedYes =
      digit === '1' || speechInput.toLowerCase().includes('yes');

    if (confirmedYes && context?.offeredSlot) {
      // Book the appointment
      try {
        const leadData = global.callData?.[callSid] || {};
        const booking = await bookAppointment(
          leadData.email || '',
          context.callerPhone,
          leadData.name || 'Unknown',
          context.offeredSlot.time
        );

        console.log('[Voice/Confirm] Booking successful');

        // Log as booked
        if (global.callData?.[callSid]) {
          global.callData[callSid].booked = true;
        }

        const confirmMsg = `Perfect! Your inspection is booked. Thank you, and we'll see you then!`;
        const audioUrl = await generateVoiceMessage(confirmMsg);
        if (audioUrl) {
          twiml.play(audioUrl);
        } else {
          twiml.say(confirmMsg);
        }
      } catch (bookingError) {
        console.error('[Voice/Confirm] Booking failed:', bookingError.message);
        const errorMsg = 'Sorry, there was an issue booking. Please call us back to reschedule.';
        const audioUrl = await generateVoiceMessage(errorMsg);
        if (audioUrl) {
          twiml.play(audioUrl);
        } else {
          twiml.say(errorMsg);
        }
      }
    } else {
      const declineMsg = 'No problem. Feel free to call us back when you find a better time.';
      const audioUrl = await generateVoiceMessage(declineMsg);
      if (audioUrl) {
        twiml.play(audioUrl);
      } else {
        twiml.say(declineMsg);
      }
    }

    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('[Voice/Confirm] Error:', error.message);
    const twiml = new VoiceResponse();
    twiml.say('Thank you for calling. Goodbye.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

// STATUS: Handle Twilio status callbacks
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  console.log(`[Voice/Status] Call ${callSid} status: ${callStatus}`);

  // Clean up context on complete
  if (callStatus === 'completed') {
    if (global.callContext?.[callSid]) {
      delete global.callContext[callSid];
    }
  }

  res.status(200).send('');
});

module.exports = router;
