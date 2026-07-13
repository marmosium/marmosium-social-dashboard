# Marmosium Social Dashboard

Ajans için çoklu marka sosyal medya rapor/istatistik aracı. Next.js + Supabase + Meta Graph API.

## Şu ana kadar oluşturulanlar
- `supabase/schema.sql` — veritabanı şeması (brands + daily_metrics tabloları)
- `lib/supabaseClient.js` — frontend Supabase bağlantısı
- `lib/supabaseAdmin.js` — sunucu tarafı Supabase bağlantısı (tam yetkili)
- `lib/meta.js` — Meta Graph API'den veri çeken fonksiyonlar
- `.env.example` — hangi ortam değişkenlerinin gerektiğinin şablonu

## Sıradaki adımlar (sizin yapmanız gerekenler)

### 1. Supabase projesi oluşturun
1. https://supabase.com adresine gidin, ücretsiz hesap açın.
2. "New Project" ile yeni bir proje oluşturun (bölge olarak Europe seçmeniz gecikmeyi azaltır).
3. Proje oluşunca sol menüden **SQL Editor**'e gidin, `supabase/schema.sql` dosyasının içeriğini yapıştırıp çalıştırın.
4. **Project Settings > API** sayfasından şunları kopyalayın:
   - `Project URL` → `.env.local` içinde `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (bunu asla frontend'e koymayın)

### 2. `.env.local` dosyasını oluşturun
Bu repoda `.env.example` dosyasını kopyalayıp `.env.local` yapın, içindeki değerleri kendi Supabase ve Meta bilgilerinizle doldurun (Meta token'ı daha önce oluşturduğumuz marmosium-api sistem kullanıcısı token'ı).

```bash
cp .env.example .env.local
```

### 3. Paketleri kurun
```bash
npm install
```

## Sırada ne var (birlikte yapacağız)
- `brands` tablosuna markaları otomatik doldurma script'i (Meta'dan `/me/accounts` çekip kaydeden)
- Günlük senkronizasyon API route'u (`/api/sync`) — Meta'dan veri çekip Supabase'e yazar
- Dashboard arayüzü — markaları listeleyen, grafik gösteren ana sayfa
