import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import archiver from 'archiver'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KOK = path.join(process.cwd(), 'public', 'raporlar')

// Path traversal koruması: yalnızca gerçek klasör/dosya adı segmentleri kabul edilir.
function guvenliSegment(s) {
  return typeof s === 'string' && s.length > 0 && !s.includes('..') && !s.includes('/') && !s.includes('\\')
}

function altDizinler(p) {
  if (!fs.existsSync(p)) return []
  return fs.readdirSync(p).filter((ad) => fs.statSync(path.join(p, ad)).isDirectory())
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const marka = searchParams.get('marka')
  const ay = searchParams.get('ay')

  if ((marka && !guvenliSegment(marka)) || (ay && !guvenliSegment(ay))) {
    return NextResponse.json({ error: 'Geçersiz parametre' }, { status: 400 })
  }
  if (!fs.existsSync(KOK)) {
    return NextResponse.json({ error: 'Rapor klasörü bulunamadı' }, { status: 404 })
  }

  const markalar = marka ? [marka] : altDizinler(KOK)

  const archive = archiver('zip', { zlib: { level: 9 } })
  let dosyaSayisi = 0

  for (const m of markalar) {
    const markaYolu = path.join(KOK, m)
    if (!fs.existsSync(markaYolu) || !fs.statSync(markaYolu).isDirectory()) continue
    const aylar = ay ? [ay] : altDizinler(markaYolu)
    for (const a of aylar) {
      const ayYolu = path.join(markaYolu, a)
      if (!fs.existsSync(ayYolu) || !fs.statSync(ayYolu).isDirectory()) continue
      const dosyalar = fs.readdirSync(ayYolu).filter(
        (f) => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.pdf')
      )
      for (const f of dosyalar) {
        archive.file(path.join(ayYolu, f), { name: `${m}/${a}/${f}` })
        dosyaSayisi++
      }
    }
  }

  if (dosyaSayisi === 0) {
    return NextResponse.json({ error: 'Eşleşen rapor bulunamadı' }, { status: 404 })
  }

  archive.finalize()

  const adParcasi = (marka || ay || 'tum-raporlar').replace(/\s+/g, '-')
  const webStream = Readable.toWeb(archive)

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${adParcasi}-raporlar.zip"`,
    },
  })
}
