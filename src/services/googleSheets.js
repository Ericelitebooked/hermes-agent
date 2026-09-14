const { google } = require('googleapis');
const config = require('../config');

async function getGoogleSheetsAuth() {
  try {
    const auth = new google.auth.JWT({
      email: config.googleServiceAccountEmail,
      key: config.googlePrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return auth;
  } catch (error) {
    console.error('[GoogleSheets] Auth error:', error.message);
    throw error;
  }
}

async function logLead(leadData) {
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toISOString();

    // 15 columns as specified
    const row = [
      timestamp, // Timestamp
      leadData.name || '', // Name
      leadData.phone || '', // Phone
      leadData.email || '', // Email
      leadData.serviceNeeded || '', // Service Needed
      leadData.score || '', // Lead Score
      leadData.tier || '', // Tier (Hot/Warm/Cold)
      leadData.urgency || '', // Urgency
      leadData.estJobValue || '', // Est Job Value
      leadData.callMade ? 'Yes' : 'No', // Call Made
      leadData.ownerAlerted ? 'Yes' : 'No', // Owner Alerted
      leadData.keySignals || '', // Key Signals
      leadData.followUpNote || '', // Follow Up Note
      leadData.problem || '', // Problem Description
      leadData.booked ? 'Yes' : 'No', // Inspection Booked
    ];

    console.log('[GoogleSheets] Appending row for', leadData.name);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: 'Sheet1!A:O',
      valueInputOption: 'RAW',
      resource: {
        values: [row],
      },
    });

    console.log('[GoogleSheets] Lead logged successfully');
    return response.data;
  } catch (error) {
    console.error('[GoogleSheets] Error logging lead:', error.message);
    if (error.message.includes('The caller does not have permission')) {
      console.error(
        '[GoogleSheets] Permission denied - ensure sheet is shared with service account email'
      );
    }
    throw error;
  }
}

module.exports = { logLead };
