const express = require('express');
const config = require('../config');
const { scoreLead } = require('../services/leadScorer');
const { initiateCall } = require('../services/twilioCall');
const { logLead } = require('../services/googleSheets');

const router = express.Router();

// Direct lead intake from Base44 form (or any JSON POST)
router.post('/leads', async (req, res) => {
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

module.exports = router;
