'use client'

import { BRAND_LOGOS } from '../../lib/brandLogos.js'

// Marka logosu varsa şeffaf zeminde gösterir (siyah/koyu logolar koyu temada okunsun diye
// ince beyaz bir parıltı (drop-shadow) uygulanıyor, kutu/arka plan yok); yoksa gradyanlı harf avatarına düşer.
export function BrandLogo({ name, className = 'h-9 w-20' }) {
  const logo = BRAND_LOGOS[name]

  if (logo) {
    return (
      <div className={`shrink-0 flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          className="max-h-full max-w-full object-contain"
          style={{ filter: 'drop-shadow(0 0 0.6px rgba(255,255,255,0.55))' }}
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
