'use client'

import { BRAND_LOGOS } from '../../lib/brandLogos.js'
import { useTheme } from '../context/ThemeContext.js'

// Marka logosu varsa şeffaf zeminde gösterir; yoksa gradyanlı harf avatarına düşer.
// Koyu temada ince beyaz bir parıltı (drop-shadow) uygulanıyor ki koyu renkli logolar
// koyu zeminde okunsun; açık temada bunun tersi (ince koyu bir parıltı) uygulanıyor ki
// logo artık açık/beyaz bir kart üzerinde dursun. Not: tamamen beyaz/çok açık renkli bir
// logo açık temada yine de zor seçilebilir — bu, otomatik (marka bazlı özel işlem
// yapılmayan) bir glow yaklaşımının bilinen sınırı.
export function BrandLogo({ name, className = 'h-9 w-20' }) {
  const { koyu } = useTheme()
  const logo = BRAND_LOGOS[name]

  if (logo) {
    return (
      <div className={`shrink-0 flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          className="max-h-full max-w-full object-contain"
          style={{
            filter: koyu
              ? 'drop-shadow(0 0 0.6px rgba(255,255,255,0.55))'
              : 'drop-shadow(0 0 0.6px rgba(0,0,0,0.35))',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-lg font-bold text-white ${className}`}
      style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #d946ef)' }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
