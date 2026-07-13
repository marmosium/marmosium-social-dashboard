-- ============================================
-- Marmosium Social Dashboard - Supabase Şeması
-- Bunu Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================

-- Her marka (Facebook Sayfası + varsa bağlı Instagram hesabı) için tek satır
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- örn: "Deconore"
  client_name text,                      -- örn: "SAYIN A.Ş." (raporları grup halinde göstermek için)
  fb_page_id text unique,                -- Graph API'den gelen Page ID
  ig_account_id text unique,             -- Graph API'den gelen Instagram Business Account ID (yoksa null)
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Her marka için günlük metrik kaydı (hem Facebook hem Instagram tek tabloda, platform sütunuyla ayrılıyor)
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  metric_date date not null,
  followers int,
  reach int,
  impressions int,
  engagement int,          -- toplam etkileşim (FB: page_post_engagements, IG: total_interactions — beğeni+yorum+kaydetme+paylaşım)
  profile_views int,
  link_clicks int,         -- profildeki linke tıklama (IG: website_clicks). FB'de karşılığı yok, null kalır.
  follower_change int,     -- o günkü net takipçi değişimi (IG: follower_count günlük seri). FB'de null, rapor tarafında toplam takipçiden hesaplanır.
  raw jsonb,                -- Graph API'den gelen ham veri, ileride yeni metrik eklemek için yedek
  created_at timestamptz default now(),
  unique (brand_id, platform, metric_date)  -- aynı gün için tekrar veri yazılırsa üzerine yazsın (upsert)
);

-- Mevcut kurulumlarda tabloyu ilk sürümden güncellemek için (yeni kurulumda yukarıdaki create table zaten yeterli):
alter table daily_metrics add column if not exists link_clicks int;
alter table daily_metrics add column if not exists follower_change int;

-- Rapor sorgularını hızlandırmak için index
create index if not exists idx_daily_metrics_brand_date
  on daily_metrics (brand_id, metric_date desc);

-- Row Level Security (RLS) - şimdilik service role ile yazacağız, ileride
-- kullanıcı girişi eklenince buraya politika yazılır. Şimdilik kapalı bırakıyoruz:
alter table brands enable row level security;
alter table daily_metrics enable row level security;

-- Service role her şeyi yapabilir (API route'larımız service role key kullanacak)
create policy "service role full access brands" on brands
  for all using (true) with check (true);
create policy "service role full access metrics" on daily_metrics
  for all using (true) with check (true);
