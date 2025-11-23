// /api/index.js  ← FINAL WITH BODYWEIGHT PATCH
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

    // === WEIGHT ONLY ===
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

    // === WORKOUT + EFFORT ===
    } else if (['workout', 'workout+effort', 'effort'].includes(data.type)) {

      // Get latest bodyweight
      const getLatestBodyweight = async () => {
        try {
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Weight Tracker!A:C',
          });
          const rows = res.data.values || [];
          if (rows.length <= 1) return 235;
          for (let i = rows.length - 1; i >= 1; i--) {
            const w = parseFloat(rows[i][2]);
            if (!isNaN(w)) return w;
          }
          return 235;
        } catch (e) { return 235; }
      };
      const BW = await getLatestBodyweight();

      const FULL_BW = ['Dips', 'Pull-up', 'Chin-up', 'Bodyweight Row'];
      const PARTIAL_BW = { 'Hanging Knee Raise': 0.25, 'Hanging Leg Raise': 0.35 };

      if (data.exercises?.length > 0) {
        data.exercises.forEach(ex => {
          ex.sets.forEach((s, i) => {
            let effectiveWeight = s.weight ?? 0;
            let noteAddon = '';

            if (FULL_BW.includes(ex.exercise)) {
              effectiveWeight = s.weight > 0 ? BW + s.weight : BW;
              noteAddon = s.weight > 0 ? `Bodyweight +${s.weight} lb` : 'Bodyweight movement';
            } else if (PARTIAL_BW[ex.exercise]) {
              effectiveWeight = Math.round(BW * PARTIAL_BW[ex.exercise] * 2) / 2;
              noteAddon = `Bodyweight movement (${PARTIAL_BW[ex.exercise] * 100}% BW)`;
            }

            const finalNotes = s.notes ? `${s.notes} | ${noteAddon}` : noteAddon;

            values.push([
              data.date || new Date().toISOString().split('T')[0],
              data.sessionId,
              ex.exercise,
              ex.liftCode,
              s.set || i + 1,
              effectiveWeight,
              s.reps,
              s.rir ?? '',
              finalNotes,
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

      // Effort
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
