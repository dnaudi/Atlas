import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function POST(req) {
  const { sessionId = 'SESS-' + Date.now(), exercises = [], effort } = await req.json()

  try {
    if (exercises.length > 0) {
      const sets = exercises.flatMap(ex =>
        ex.sets.map(s => ({
          session_id: sessionId,
          date: '2025-11-22',
          exercise: ex.exercise,
          lift_code: ex.liftCode || '',
          set_number: s.set,
          weight: Number(s.weight),
          reps: Number(s.reps),
          rir: s.rir === undefined ? null : Number(s.rir)
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
        location: effort.location || null
      })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
