require('dotenv').config();

module.exports = {
  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // ElevenLabs
  elevenApiKey: process.env.ELEVEN_API_KEY,
  elevenVoiceId: process.env.ELEVEN_VOICE_ID,

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

  // Cal.com
  calApiKey: process.env.CAL_API_KEY,
  calUsername: process.env.CAL_USERNAME,
  calEventTypeId: process.env.CAL_EVENT_TYPE_ID,

  // Google Sheets
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null,
  googleSheetId: process.env.GOOGLE_SHEET_ID,

  // Typeform
  typeformSecret: process.env.TYPEFORM_SECRET,

  // Server
  serverUrl: process.env.SERVER_URL,
  ownerPhoneNumber: process.env.OWNER_PHONE_NUMBER,
  timezone: process.env.TIMEZONE || 'America/New_York',
  port: process.env.PORT || 3000,
};
