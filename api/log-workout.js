import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionId = 'TEST-' + Date.now(), exercises = [], effort } = req.body

  try {
    if (exercises.length > 0) {
      const sets = exercises.flatMap(ex =>
        ex.sets.map(s => ({
          session_id: sessionId,
          date: '2025-11-22',
          exercise: ex.exercise,
          lift_code: ex.liftCode || '',
          set_number: s.set,
          weight: s.weight,
          reps: s.reps,
          rir: s.rir ?? null,
        }))
      )
      await supabase.from('workout_log').insert(sets)
    }

    if (effort) {
      await supabase.from('effort').insert({
        session_id: sessionId,
        date: '2025-11-22',
        duration: effort.duration || null,
        active_calories: effort.activeCalories || 0,
        total_calories: effort.totalCalories || 0,
        avg_hr: effort.avgHR || 0,
        peak_hr: effort.peakHR || 0,
        location: effort.location || null,
      })
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
