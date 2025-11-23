// /api/next.js  ← unchanged, still 100% correct
import { google } from 'googleapis';

export const config = { api: { bodyParser: true } };

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SHEET_ID;

const RIR_PROGRESSION = { 0: 10, 1: 5, 2: 5, 3: 0 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const [logRes, effortRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Log!A:M' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Effort!A:H' }),
    ]);

    const logRows = (logRes.data.values || []).slice(1);
    const effortRows = (effortRes.data.values || []).slice(1);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);

    const bestByLift = new Map();
    logRows.forEach(row => {
      const [date, , , liftCode, , weight, reps, rir] = row;
      if (new Date(date) < cutoff) return;
      if (!liftCode) return;
      const w = Number(weight), r = Number(reps), e1rm = w * (1 + r / 30);
      if (!bestByLift.has(liftCode) || e1rm > bestByLift.get(liftCode).e1rm) {
        bestByLift.set(liftCode, { w, r, rir: rir === '' ? null : Number(rir) });
      }
    });

    const tomorrow = new Date(Date.now() + 86400000);
    const sessionId = tomorrow.toISOString().slice(0, 16).replace(/[-T:]/g, '').slice(0, 12);

    const exercises = [
      { code: 'SQU01', name: 'Squat' },
      { code: 'BEN01', name: 'Bench Press' },
      { code: 'ROW01', name: 'Barbell Row' },
      { code: 'DEA01', name: 'Deadlift' },
      { code: 'OHP01', name: 'Overhead Press' },
    ];

    const plan = exercises.map(ex => {
      const best = bestByLift.get(ex.code);
      if (!best) return { exercise: ex.name, liftCode: ex.code, sets: [], warmup: [] };
      const add = RIR_PROGRESSION[best.rir ?? 2] || 5;
      const next = Math.round((best.w + add) / 5) * 5;
      return {
        exercise: ex.name,
        liftCode: ex.code,
        sets: [
          { set: 1, weight: next, targetReps: 8, rir: '2' },
          { set: 2, weight: next, targetReps: 8, rir: '1–2' },
          { set: 3, weight: next, targetReps: 8, rir: '1' },
        ],
        warmup: [{ weight: Math.round(best.w * 0.4 / 5) * 5, reps: 5 }]
      };
    });

    res.json({ success: true, nextSessionId: sessionId, date: tomorrow.toISOString().slice(0,10), plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
