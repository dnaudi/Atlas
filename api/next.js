// /api/next.js
import { google } from 'googleapis';

export const config = { api: { bodyParser: true } };

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SHEET_ID;

const RIR_PROGRESSION = {
  0: { add: 10, minReps: 6 },
  1: { add: 5,  minReps: 7 },
  2: { add: 5,  minReps: 8 },
  3: { add: 0,  minReps: 10 },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    // 1. Pull last 14 days of Log + Effort
    const [logRes, effortRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Log!A:M' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Effort!A:H' }),
    ]);

    const logRows = (logRes.data.values || []).slice(1);     // skip header
    const effortRows = (effortRes.data.values || []).slice(1);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const recentSessions = new Map();

    // Group Log by Session ID
    logRows.forEach(row => {
      const [date, sessionId, exercise, liftCode, , weight, reps, rir] = row;
      const sessionDate = new Date(date);
      if (sessionDate < cutoff) return;

      if (!recentSessions.has(sessionId)) recentSessions.set(sessionId, { sets: [], effort: null });
      recentSessions.get(sessionId).sets.push({
        liftCode,
        exercise,
        weight: Number(weight),
        reps: Number(reps),
        rir: rir === '' ? null : Number(rir),
      });
    });

    // Attach Effort data
    effortRows.forEach(row => {
      const [date, sessionId, duration, activeCal] = row;
      const sessionDate = new Date(date);
      if (sessionDate < cutoff || !recentSessions.has(sessionId)) return;
      recentSessions.get(sessionId).effort = { duration, activeCal: Number(activeCal) };
    });

    // 2. Find best recent performance per Lift Code
    const bestByLift = new Map();

    for (const { sets } of recentSessions.values()) {
      sets.forEach(s => {
        if (!s.liftCode || !s.weight || !s.reps) return;
        const key = s.liftCode;
        const e1rm = s.weight * (1 + s.reps / 30);
        if (!bestByLift.has(key) || e1rm > bestByLift.get(key).e1rm) {
          bestByLift.set(key, { ...s, e1rm });
        }
      });
    }

    // 3. Build next session (simple 4-day rotating upper/lower for now)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tomorrowCode = new Date(Date.now() + 86400000)
      .toISOString()
      .slice(0, 16)
      .replace(/[-T:]/g, '')
      .slice(0, 12); // YYYYMMDDHHMM

    const plan = [];
    const exercises = [
      { code: 'SQU01', name: 'Squat', warmup: [0.4, 0.6, 0.75] },
      { code: 'BEN01', name: 'Bench Press', warmup: [0.4, 0.6, 0.75] },
      { code: 'ROW01', name: 'Barbell Row', warmup: [0.5, 0.7] },
      { code: 'DEA01', name: 'Deadlift', warmup: [0.5, 0.7] },
      { code: 'OHP01', name: 'Overhead Press', warmup: [0.4, 0.6] },
    ];

    exercises.forEach(ex => {
      const best = bestByLift.get(ex.code);
      if (!best) {
        plan.push({ exercise: ex.name, liftCode: ex.code, sets: [], warmup: [] });
        return;
      }

      const lastRIR = best.rir ?? 2;
      const progression = RIR_PROGRESSION[lastRIR] || RIR_PROGRESSION[2];
      const nextWeight = Math.round((best.weight + progression.add) / 5) * 5;

      const sets = [
        { set: 1, weight: nextWeight, targetReps: 8, rir: '2' },
        { set: 2, weight: nextWeight, targetReps: 8, rir: '1–2' },
        { set: 3, weight: nextWeight, targetReps: 8, rir: '1' },
      ];

      const warmup = ex.warmup.map(pct => ({
        weight: Math.round(best.weight * pct / 5) * 5,
        reps: pct < 0.7 ? 5 : 3,
      }));

      plan.push({
        exercise: ex.name,
        liftCode: ex.code,
        sets,
        warmup,
      });
    });

    // 4. Return full next session ready to log
    res.status(200).json({
      success: true,
      nextSessionId: tomorrowCode,
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      plan,
      logThisWorkoutUrl: 'https://api.postman.com/collections/3391840-5c8f4a2f-9a1d-4e0b-8c3f-7d5e6f8a9b0c?access_key=PMAT-01JCKG9W3H2N7T4R8V9X0Y1Z2A3B4C5D',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
