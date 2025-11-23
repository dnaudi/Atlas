// pages/api/log-bodyweight.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  )

  const data = req.body || {}

  const { error } = await supabase.from('bodyweight').insert({
    date: '2025-11-22',
    time: new Date().toLocaleTimeString(),
    weight: data.weight || 232.6,
    bmi: data.bmi || 33.7,
    body_fat: data.bodyFat || 31.9,
    skeletal_muscle: data.skeletalMuscle || 44.0,
    fat_free_mass: data.fatFreeMass || 158.2,
    subcutaneous_fat: data.subcutaneousFat || 27.3,
    visceral_fat: data.visceralFat || 16,
    body_water: data.bodyWater || 49.1,
    muscle_mass: data.muscleMass || 150.4,
    bone_mass: data.boneMass || 8.0,
    protein: data.protein || 15.5,
    bmr: data.bmr || 1919,
    metabolic_age: data.metabolicAge || 42,
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ success: true })
}
