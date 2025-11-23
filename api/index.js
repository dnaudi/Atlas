const { google } = require('googleapis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const data = req.body;

  if (!data.type) return res.status(400).json({ error: 'Missing type' });

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Auth credentials invalid: ' + err.message });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.SHEET_ID;

  if (!sheetId) return res.status(500).json({ error: 'Missing SHEET_ID env var' });

  try {
    let range, values = [];

    if (data.type === 'weight') {
      range = 'Weight Tracker!A:P';  // Adjust columns as needed
      values = [[
        data.date || new Date().toISOString().split('T')[0],
        data.time || '',
        data.weightLb || '',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]];
    } else {
      return res.status(400).json({ error: 'Only "weight" type supported for now' });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Full error:', err);
    res.status(500).json({ error: err.message });
  }
};
