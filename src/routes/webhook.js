const express = require('express');
const config = require('../config');
const { scoreLead } = require('../services/leadScorer');
const { initiateCall } = require('../services/twilioCall');
const { logLead, logProspect } = require('../services/googleSheets');

const router = express.Router();

// Handle preflight OPTIONS request for CORS
router.options('/leads', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://roof-avenger.base44.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Direct lead intake from Base44 form (or any JSON POST)
router.post('/leads', async (req, res) => {
  // CORS headers for Base44 form submissions
  res.setHeader('Access-Control-Allow-Origin', 'https://roof-avenger.base44.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log('[API] Lead submission received');

    // Parse direct JSON payload from form
    const { name, phone, email, serviceNeeded, problemDescription, city } =
      req.body;

    // Validate required fields
    if (!name || !phone) {
      console.warn('[API] Missing required fields (name, phone)');
      return res.status(400).json({
        error: 'Missing required fields: name, phone',
      });
    }

    const leadData = {
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      serviceNeeded: (serviceNeeded || '').trim(),
      problem: (problemDescription || '').trim(),
      city: (city || '').trim(),
      propertyLocation: city ? `${city}` : '',
      timeframe: '', // Not provided by Base44 form, will be asked during call
    };

    console.log('[API] Parsed lead:', {
      name: leadData.name,
      phone: leadData.phone,
      service: leadData.serviceNeeded,
      city: leadData.city,
    });

    // Score the lead using Claude AI
    const scoringResult = await scoreLead(leadData);
    const finalLeadData = { ...leadData, ...scoringResult };

    console.log('[API] Lead scored:', {
      score: finalLeadData.score,
      tier: finalLeadData.tier,
    });

    // Determine if call should be made (Hot 8-10 or Warm 5-7)
    const shouldCall =
      (finalLeadData.tier === 'Hot' || finalLeadData.tier === 'Warm') &&
      finalLeadData.phone;

    // Log to Google Sheets
    try {
      await logLead({
        ...finalLeadData,
        callMade: shouldCall,
        booked: false,
      });
      console.log('[API] Lead logged to Google Sheets');
    } catch (sheetError) {
      console.error('[API] Failed to log to sheets:', sheetError.message);
      // Continue anyway - don't block the call
    }

    // Make outbound call if qualified
    if (shouldCall) {
      try {
        await initiateCall(finalLeadData.phone, finalLeadData);
        console.log('[API] Call initiated for', finalLeadData.name);
      } catch (callError) {
        console.error('[API] Failed to initiate call:', callError.message);
        // Continue - don't block the response
      }
    } else {
      console.log(
        `[API] Lead not qualified for immediate call (score: ${finalLeadData.score}, tier: ${finalLeadData.tier})`
      );
    }

    res.status(200).json({
      success: true,
      leadId: `lead-${Date.now()}`,
      name: finalLeadData.name,
      score: finalLeadData.score,
      tier: finalLeadData.tier,
      callInitiated: shouldCall,
      message: shouldCall
        ? `Call initiated for ${finalLeadData.name}`
        : `Lead qualified but below call threshold (score: ${finalLeadData.score})`,
    });
  } catch (error) {
    console.error('[API] Error processing lead:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handle preflight OPTIONS request for CORS
router.options('/prospects', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://roof-avenger.base44.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Roofer prospect signup from the RoofAvenger landing page (sales pipeline,
// separate from the homeowner /leads pipeline — no scoring or voice call here)
router.post('/prospects', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://roof-avenger.base44.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log('[API] Prospect submission received');

    const {
      companyName,
      ownerName,
      phone,
      email,
      services,
      currentChallenge,
      preferredContactTime,
      cityState,
    } = req.body;

    if (!companyName || !ownerName || !phone) {
      console.warn('[API] Missing required fields (companyName, ownerName, phone)');
      return res.status(400).json({
        error: 'Missing required fields: companyName, ownerName, phone',
      });
    }

    const prospectData = {
      companyName: companyName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      services: (services || '').trim(),
      currentChallenge: (currentChallenge || '').trim(),
      preferredContactTime: (preferredContactTime || '').trim(),
      cityState: (cityState || '').trim(),
    };

    console.log('[API] Parsed prospect:', {
      company: prospectData.companyName,
      owner: prospectData.ownerName,
      phone: prospectData.phone,
    });

    await logProspect(prospectData);
    console.log('[API] Prospect logged to Google Sheets');

    res.status(200).json({
      success: true,
      message: `Thanks ${prospectData.ownerName}, we'll be in touch shortly.`,
    });
  } catch (error) {
    console.error('[API] Error processing prospect:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
