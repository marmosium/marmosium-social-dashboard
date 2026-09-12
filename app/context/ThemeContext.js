'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const TEMA_ANAHTARI = 'marsamedya-tema'

const ThemeContext = createContext({ tema: 'dark', koyu: true, temaDegistir: () => {} })

// Site genelinde tek bir tema kaynağı — daha önce sadece /raporlar sayfasına
// özel olan bu mantık (localStorage -> yoksa sistem tercihi -> yoksa koyu)
// buraya taşındı ki tüm sayfalar (dashboard, login, marka raporu, raporlar)
// aynı temayı paylaşsın. <html> üzerine "light-mode" sınıfını uygular;
// globals.css bu sınıfa göre body arkaplanı, .glass, .premium-card gibi
// paylaşılan yüzeyleri değiştirir. Sayfa bileşenlerindeki metin/kenarlık gibi
// ince ayarlar için `koyu` değeri kullanılır.
export function ThemeProvider({ children }) {
  const [tema, setTema] = useState('dark')

  useEffect(() => {
    try {
      const kayitli = window.localStorage.getItem(TEMA_ANAHTARI)
      if (kayitli === 'light' || kayitli === 'dark') {
        setTema(kayitli)
        return
      }
    } catch (e) {
      // localStorage erişilemez olabilir (gizli sekme vb.) - sorun değil, devam
    }
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTema('light')
      }
    } catch (e) {
      // matchMedia yoksa varsayılan koyu temada kal
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', tema === 'light')
  }, [tema])

  function temaDegistir() {
    setTema((onceki) => {
      const yeni = onceki === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(TEMA_ANAHTARI, yeni)
      } catch (e) {
        // yazılamazsa da tema bu oturumda değişmeye devam eder
      }
      return yeni
    })
  }

  return <ThemeContext.Provider value={{ tema, koyu: tema === 'dark', temaDegistir }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
