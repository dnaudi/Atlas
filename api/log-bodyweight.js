import { GoogleSpreadsheet } from 'google-spreadsheet';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;

  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Weight Tracker'];
    await sheet.addRow({
      Date: data.date || new Date().toISOString().split('T')[0],
      Time: data.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      'Weight(lb)': data.weight,
      BMI: data.bmi,
      'Body Fat(%)': data.bodyFat,
      'Skeletal Muscle(%)': data.skeletalMuscle,
      'Fat-Free Mass(lb)': data.fatFreeMass,
      'Subcutaneous Fat(%)': data.subcutaneousFat,
      'Visceral Fat': data.visceralFat,
      'Body Water(%)': data.bodyWater,
      'Muscle Mass(lb)': data.muscleMass,
      'Bone Mass(lb)': data.boneMass,
      'Protein (%)': data.protein,
      'BMR(kcal)': data.bmr,
      'Metabolic Age': data.metabolicAge,
      'Waist (in)': data.waist || '',
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
