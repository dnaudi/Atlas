// /api/index.js   ← FINAL VERSION (workout + effort + weight)
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  const data = req.body;
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.SHEET_ID;

  try {
    const values = [];

    if (data.type === 'weight') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Weight Tracker!A:P',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[
          data.date || new Date().toISOString().split('T')[0],
          data.time || '',
          data.weightLb || '',
          ...Array(13).fill('')
        ]]},
      });

    } else if (['workout', 'workout+effort', 'effort'].includes(data.type)) {
      // === WORKOUT SETS ===
      if (data.exercises?.length > 0) {
        data.exercises.forEach(ex => {
          ex.sets.forEach((s, i) => {
            values.push([
              data.date || new Date().toISOString().split('T')[0],
              data.sessionId,
              ex.exercise,
              ex.liftCode,
              s.set || i + 1,
              s.weight ?? 0,
              s.reps,
              s.rir ?? '',
              s.notes || '',
              `=F${values.length + 2}*G${values.length + 2}`,          // Volume
              `=F${values.length + 2}*(1+G${values.length + 2}/30)`,   // e1RM
              '', 'OK'
            ]);
          });
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Log!A:M',
          valueInputOption: 'USER_ENTERED',
          resource: { values },
        });
      }

      // === EFFORT DATA ===
      if (data.type.includes('effort') && data.duration) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Effort!A:H',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[
            data.date || new Date().toISOString().split('T')[0],
            data.sessionId,
            data.duration,
            data.activeCalories ?? '',
            data.totalCalories ?? '',
            data.avgHr ?? '',
            data.peakHr ?? '',
            data.location || 'Pitt Meadows Gym'
          ]]},
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
