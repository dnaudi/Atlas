// /api/index.js  ← FINAL VERSION (Nov 2025)
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
    // === FULL SCALE / WEIGHT LOGGING (all 16 columns) ===
    if (data.type === 'weight' || data.type === 'scale') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Weight Tracker!A:P',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[
          data.date || new Date().toISOString().split('T')[0],
          data.time || new Date().toTimeString().slice(0, 8),
          data.weightLb || '',
          data.bmi || '',
          data.bodyFatPct || '',
          data.skeletalMusclePct || '',
          data.fatFreeMassLb || '',
          data.subcutaneousFatPct || '',
          data.visceralFat || '',
          data.bodyWaterPct || '',
          data.muscleMassLb || '',
          data.boneMassLb || '',
          data.proteinPct || '',
          data.bmrKcal || '',
          data.metabolicAge || '',
          data.waistIn || ''
        ]]},
      });
      return res.json({ success: true });
    }

    // === WORKOUT + EFFORT LOGGING ===
    if (!['workout', 'workout+effort', 'effort'].includes(data.type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const values = [];

    // Get latest bodyweight for effective load
    const getLatestBW = async () => {
      try {
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Weight Tracker!A:C' });
        const rows = res.data.values || [];
        for (let i = rows.length - 1; i >= 1; i--) {
          const w = parseFloat(rows[i][2]);
          if (!isNaN(w)) return w;
        }
        return 235;
      } catch { return 235; }
    };
    const BW = await getLatestBW();

    const FULL_BW = ['Dips', 'Pull-up', 'Chin-up', 'Bodyweight Row'];
    const PARTIAL_BW = { 'Hanging Knee Raise': 0.25, 'Hanging Leg Raise': 0.35 };

    // Log workout sets
    if (data.exercises?.length > 0) {
      data.exercises.forEach(ex => {
        ex.sets.forEach((s, i) => {
          let weight = s.weight ?? 0;
          let note = '';

          if (FULL_BW.includes(ex.exercise)) {
            weight = s.weight > 0 ? BW + s.weight : BW;
            note = s.weight > 0 ? `Bodyweight +${s.weight} lb` : 'Bodyweight movement';
          } else if (PARTIAL_BW[ex.exercise]) {
            weight = Math.round(BW * PARTIAL_BW[ex.exercise] * 2) / 2;
            note = `Bodyweight movement (${PARTIAL_BW[ex.exercise] * 100}% BW)`;
          }

          const finalNote = s.notes ? `${s.notes} | ${note}` : note;

          values.push([
            data.date || new Date().toISOString().split('T')[0],
            data.sessionId,
            ex.exercise,
            ex.liftCode,
            s.set || i + 1,
            weight,
            s.reps,
            s.rir ?? '',
            finalNote,
            `=F${values.length + 2}*G${values.length + 2}`,
            `=F${values.length + 2}*(1+G${values.length + 2}/30)`,
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

    // Log effort
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

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
