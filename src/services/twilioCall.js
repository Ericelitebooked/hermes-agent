const twilio = require('twilio');
const config = require('../config');

const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

async function initiateCall(toPhoneNumber, leadData) {
  try {
    const voiceUrl = `${config.serverUrl}/voice/start`;
    const statusCallback = `${config.serverUrl}/voice/status`;

    console.log(`[Twilio] Initiating call to ${toPhoneNumber}`);
    console.log(`[Twilio] Voice URL: ${voiceUrl}`);

    const call = await client.calls.create({
      from: config.twilioPhoneNumber,
      to: toPhoneNumber,
      url: voiceUrl,
      statusCallback: statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    console.log(`[Twilio] Call created with SID: ${call.sid}`);

    // Store call data in memory (in production, use a database)
    global.callData = global.callData || {};
    global.callData[call.sid] = {
      ...leadData,
      callSid: call.sid,
      status: 'initiated',
      startTime: new Date(),
    };

    return call.sid;
  } catch (error) {
    console.error('[Twilio] Error initiating call:', error.message);
    throw error;
  }
}

module.exports = { initiateCall };
