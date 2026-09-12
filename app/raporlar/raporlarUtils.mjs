// Saf (React'tan bağımsız) yardımcı fonksiyonlar — page.js tarafından import
// edilir ve düz `node` ile de (JSX derlemesine gerek kalmadan) test edilebilir.

export function dosyaPlatformu(ad) {
  return ad.toUpperCase().includes('INSTAGRAM') ? 'instagram' : 'facebook'
}

// Arama kutusu hoşgörülü olmalı: çoğu kişi Türkçe karakterleri (ğ/ş/ç/ö/ü)
// ya da doğru İ/I/ı ayrımını klavyede uğraşıp yazmaz — "agustos" yazıp
// "Ağustos"u, "vakfi" yazıp "VAKFI"yı bulabilmeli. Hem sorguyu hem de
// karşılaştırılan metni aynı sadeleştirilmiş forma indirgiyoruz: önce
// İ/I/ı -> i (tr-TR küçültmesinin "VAKFI" -> "vakfı" gibi ters sürpriz
// sonuçlarını önlemek için), sonra ğşçöü -> gscou, en son da (kalanlar
// için) Türkçe küçük harfe çeviriyoruz.
function sadeleştir(s) {
  return (s || '')
    .replace(/[İIı]/g, 'i')
    .replace(/ğ/gi, 'g')
    .replace(/ş/gi, 's')
    .replace(/ç/gi, 'c')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .toLocaleLowerCase('tr-TR')
}

export function eslesiyorMu(sorgu, marka, ay) {
  if (!sorgu || !sorgu.trim()) return true
  const s = sadeleştir(sorgu.trim())
  return sadeleştir(marka).includes(s) || sadeleştir(ay).includes(s)
}

// `aylar` ağacını arama metni + platform filtresine göre süzer; süzgeçten
// sonra dosyası kalmayan marka/ay grupları tamamen kaldırılır (yarım boş
// kart göstermemek için).
export function filtreleAylar(aylar, sorgu, platform) {
  return aylar
    .map(({ ay, markalar }) => {
      const suzulmusMarkalar = markalar
        .map((m) => {
          if (!eslesiyorMu(sorgu, m.marka, ay)) return null
          const dosyalar =
            platform === 'all' ? m.dosyalar : m.dosyalar.filter((d) => dosyaPlatformu(d.ad) === platform)
          if (dosyalar.length === 0) return null
          return { ...m, dosyalar }
        })
        .filter(Boolean)
      if (suzulmusMarkalar.length === 0) return null
      return { ay, markalar: suzulmusMarkalar }
    })
    .filter(Boolean)
}

// Aynı temel rapor adının (uzantı hariç) PNG ve PDF varyantlarını tek bir
// karta indirger — ör. aynı ay/marka/platform için hem .png hem .pdf çıkınca
// iki ayrı kutucuk yerine tek kutucukta format seçimi sunulur. Sıra: önce
// hangi format önce geldiyse (genelde PNG) öyle korunur.
export function raporlaraGrupla(dosyalar) {
  const gruplar = new Map()
  for (const dosya of dosyalar) {
    const temelAd = dosya.ad.replace(/\.(png|pdf)$/i, '')
    if (!gruplar.has(temelAd)) {
      gruplar.set(temelAd, { temelAd, platform: dosyaPlatformu(dosya.ad), formatlar: {} })
    }
    gruplar.get(temelAd).formatlar[dosya.format] = dosya
  }
  return Array.from(gruplar.values())
}

// Bir rapor grubu için tercih edilen (varsayılan açılacak) format: PNG varsa
// PNG (doğrudan görüntülenebilir), yoksa PDF.
export function tercihEdilenFormat(rapor) {
  if (rapor.formatlar.png) return 'png'
  if (rapor.formatlar.pdf) return 'pdf'
  return null
}

// Önizleme modalında ok tuşlarıyla gezinmek için, ekranda görünen (süzülmüş)
// ay -> marka -> dosya ağacını, PNG/PDF'i tek kart sayan düz bir rapor
// listesine indirger.
export function duzDosyaListesi(aylar) {
  const liste = []
  for (const { ay, markalar } of aylar) {
    for (const { marka, dosyalar } of markalar) {
      for (const rapor of raporlaraGrupla(dosyalar)) {
        liste.push({ ay, marka, rapor })
      }
    }
  }
  return liste
}

// Bir sonraki/önceki indeksi döngüsel (başa/sona sararak) hesaplar.
// yon: +1 (sonraki) veya -1 (önceki).
export function sonrakiIndeks(mevcutIndeks, uzunluk, yon) {
  if (uzunluk === 0) return -1
  return (mevcutIndeks + yon + uzunluk) % uzunluk
}

// Odak bir metin girdisinin içindeyken tek-tuş kısayollarının (d, t, ? gibi)
// tetiklenmemesi gerekir — kullanıcı arama kutusuna yazarken "d" harfi dosya
// indirmemeli. Escape ve "/" bu kontrolden muaf tutulur (çağıran taraf onları
// ayrı ele alır).
export function odaktaGirdiVarMi(aktifEleman) {
  if (!aktifEleman || !aktifEleman.tagName) return false
  const etiket = aktifEleman.tagName.toUpperCase()
  return etiket === 'INPUT' || etiket === 'TEXTAREA' || aktifEleman.isContentEditable === true
}
