import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function POST(req) {
  const body = await req.json()

  const { error } = await supabase.from('bodyweight').insert({
    date: body.date || '2025-11-22',
    time: new Date().toLocaleTimeString('en-US'),
    weight: Number(body.weight) || 232.6,
    bmi: Number(body.bmi) || 33.7,
    body_fat: Number(body.body_fat) || 31.9,
    skeletal_muscle: Number(body.skeletal_muscle) || 44.0,
    fat_free_mass: Number(body.fat_free_mass) || 158.2,
    subcutaneous_fat: Number(body.subcutaneous_fat) || 27.3,
    visceral_fat: Number(body.visceral_fat) || 16,
    body_water: Number(body.body_water) || 49.1,
    muscle_mass: Number(body.muscle_mass) || 150.4,
    bone_mass: Number(body.bone_mass) || 8.0,
    protein: Number(body.protein) || 15.5,
    bmr: Number(body.bmr) || 1919,
    metabolic_age: Number(body.metabolic_age) || 42
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
