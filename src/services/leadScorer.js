const axios = require('axios');
const config = require('../config');

async function scoreLead(leadData) {
  const {
    name,
    phone,
    email,
    serviceNeeded,
    problem,
    propertyLocation,
    timeframe,
  } = leadData;

  const prompt = `You are an expert lead qualifier for a home inspection business. Score this lead on a scale of 1-10.

Lead Information:
- Name: ${name}
- Phone: ${phone}
- Email: ${email}
- Service: ${serviceNeeded}
- Problem: ${problem}
- Location: ${propertyLocation}
- Timeframe: ${timeframe}

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "score": <number 1-10>,
  "tier": "<Hot|Warm|Cold>",
  "urgency": "<High|Medium|Low>",
  "estJobValue": "<$1000-2000 for example>",
  "keySignals": "<brief comma-separated factors>",
  "followUpNote": "<one sentence recommendation>"
}

Scoring guidelines:
- Hot (8-10): Urgent need, clear budget, ready to book
- Warm (5-7): Real need, some hesitation
- Cold (1-4): Vague inquiry, low intent`;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-opus-4-1',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );

    const responseText = response.data.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const result = JSON.parse(jsonMatch[0]);
    console.log('[Scorer] Lead scored:', {
      name,
      score: result.score,
      tier: result.tier,
    });
    return result;
  } catch (error) {
    console.error('[Scorer] Error scoring lead:', error.message);
    // Return safe default
    return {
      score: 5,
      tier: 'Warm',
      urgency: 'Medium',
      estJobValue: 'Unknown',
      keySignals: 'Incomplete scoring',
      followUpNote: 'Manual review recommended',
    };
  }
}

module.exports = { scoreLead };
