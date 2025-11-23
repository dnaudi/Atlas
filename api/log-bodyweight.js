import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const data = req.body || {}

  const { error } = await supabase.from('bodyweight').insert({
    date: data.date || '2025-11-22',
    time: new Date().toLocaleTimeString('en-US'),
    weight: Number(data.weight) || 232.6,
    bmi: Number(data.bmi) || 33.7,
    body_fat: Number(data.bodyFat) || 31.9,
    skeletal_muscle: Number(data.skeletalMuscle) || 44.0,
    fat_free_mass: Number(data.fatFreeMass) || 158.2,
    subcutaneous_fat: Number(data.subcutaneousFat) || 27.3,
    visceral_fat: Number(data.visceralFat) || 16,
    body_water: Number(data.bodyWater) || 49.1,
    muscle_mass: Number(data.muscleMass) || 150.4,
    bone_mass: Number(data.boneMass) || 8.0,
    protein: Number(data.protein) || 15.5,
    bmr: Number(data.bmr) || 1919,
    metabolic_age: Number(data.metabolicAge) || 42
  })

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
