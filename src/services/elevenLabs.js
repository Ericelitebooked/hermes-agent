const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

async function textToSpeech(text, uniqueId = 'default') {
  try {
    if (!config.elevenApiKey || !config.elevenVoiceId) {
      console.warn('[ElevenLabs] Missing credentials, will fall back to Twilio Say');
      return null;
    }

    console.log(`[ElevenLabs] Converting text to speech (${text.length} chars)`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenVoiceId}`,
      {
        text: text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenApiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    // Save MP3 to src/audio folder
    const audioDir = path.join(__dirname, '..', 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const filename = `${uniqueId}-${Date.now()}.mp3`;
    const filepath = path.join(audioDir, filename);

    fs.writeFileSync(filepath, response.data);
    console.log(`[ElevenLabs] Saved audio to ${filename}`);

    // Return URL for Twilio to play
    const audioUrl = `${config.serverUrl}/audio/${filename}`;
    return audioUrl;
  } catch (error) {
    console.error('[ElevenLabs] Error generating speech:', error.message);
    // Caller should fall back to Twilio <Say>
    return null;
  }
}

module.exports = { textToSpeech };
