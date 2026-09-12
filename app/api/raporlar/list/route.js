import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KOK = path.join(process.cwd(), 'public', 'raporlar')
const AY_SIRA = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function dizinMi(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory()
}

export async function GET() {
  if (!dizinMi(KOK)) return NextResponse.json({ aylar: [] })

  const markalar = fs.readdirSync(KOK).filter((m) => dizinMi(path.join(KOK, m)))

  const ayMap = {}
  for (const marka of markalar) {
    const markaYolu = path.join(KOK, marka)
    const aylar = fs.readdirSync(markaYolu).filter((a) => dizinMi(path.join(markaYolu, a)))
    for (const ay of aylar) {
      const ayYolu = path.join(markaYolu, ay)
      const dosyalar = fs
        .readdirSync(ayYolu)
        .filter((f) => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.pdf'))
        .sort()
      if (dosyalar.length === 0) continue
      if (!ayMap[ay]) ayMap[ay] = []
      ayMap[ay].push({
        marka,
        dosyalar: dosyalar.map((f) => ({
          ad: f,
          url: `/raporlar/${encodeURIComponent(marka)}/${encodeURIComponent(ay)}/${encodeURIComponent(f)}`,
          format: f.toLowerCase().endsWith('.pdf') ? 'pdf' : 'png',
        })),
      })
    }
  }

  const aylar = Object.keys(ayMap)
    .sort((a, b) => AY_SIRA.indexOf(a) - AY_SIRA.indexOf(b))
    .map((ay) => ({
      ay,
      markalar: ayMap[ay].sort((x, y) => x.marka.localeCompare(y.marka, 'tr')),
    }))

  return NextResponse.json({ aylar })
}
