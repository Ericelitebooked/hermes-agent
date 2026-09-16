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

    // 19 columns (15 original + 4 follow-up fields)
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
      '', // Call Notes (empty initially)
      '', // Follow-up Date (empty initially)
      '', // Next Action (empty initially)
      1, // Contact Attempt # (starts at 1)
    ];

    console.log('[GoogleSheets] Appending row for', leadData.name);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: 'Sheet1!A:S',
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

async function logProspect(prospectData) {
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toISOString();

    const row = [
      timestamp, // Timestamp
      prospectData.companyName || '', // Company Name
      prospectData.ownerName || '', // Owner Name
      prospectData.phone || '', // Phone
      prospectData.email || '', // Email
      prospectData.services || '', // Services Offered
      prospectData.currentChallenge || '', // Current Challenge
      prospectData.preferredContactTime || '', // Preferred Contact Time
      prospectData.cityState || '', // City/State
      'New', // Status (New / Contacted / Booked / Closed)
      '', // Follow-up Notes (empty initially)
    ];

    console.log('[GoogleSheets] Appending prospect row for', prospectData.companyName);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheetId,
      range: 'Prospects!A:K',
      valueInputOption: 'RAW',
      resource: {
        values: [row],
      },
    });

    console.log('[GoogleSheets] Prospect logged successfully');
    return response.data;
  } catch (error) {
    console.error('[GoogleSheets] Error logging prospect:', error.message);
    if (error.message.includes('The caller does not have permission')) {
      console.error(
        '[GoogleSheets] Permission denied - ensure sheet is shared with service account email'
      );
    }
    if (error.message.includes('Unable to parse range')) {
      console.error(
        '[GoogleSheets] "Prospects" tab not found - create a tab named exactly "Prospects" in the sheet'
      );
    }
    throw error;
  }
}

module.exports = { logLead, logProspect };
