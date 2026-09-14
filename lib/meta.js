// lib/meta.js
// Meta Graph API ile konuşan tüm fonksiyonlar burada toplanıyor.
// Token her zaman .env.local içindeki META_SYSTEM_USER_TOKEN'dan okunur, kodda hardcode edilmez.

const API_VERSION = process.env.META_API_VERSION || "v25.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getToken() {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error("META_SYSTEM_USER_TOKEN .env.local içinde tanımlı değil");
  }
  return token;
}

// "until" (YYYY-MM-DD) tarihinin ertesi gününü döndürür — Meta'nın metric_type=total_value
// endpoint'i since/until aralığını üstten AÇIK (exclusive) kabul ediyor: since=until=aynı gün
// verilirse sıfır genişlikte bir pencere olduğu için data dizisi boş dönüyor. Tam olarak "o günü"
// kapsayan tek günlük bir toplam istemek için until'ı bir gün ileri almak gerekiyor.
function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// since..until (ikisi de dahil, YYYY-MM-DD) aralığındaki her günü sıralı bir dizi olarak döndürür.
// Instagram'ın total_value metrikleri (profile_views/total_interactions/website_clicks) period=day
// desteklemediği için, aralığın tamamını doldurmak amacıyla her gün için ayrı ayrı tek-günlük
// (nextDay tekniğiyle) bir total_value isteği atılıyor — bkz. fetchInstagramInsights.
function enumerateDays(sinceStr, untilStr) {
  const gunler = [];
  let cursor = sinceStr;
  while (cursor <= untilStr) {
    gunler.push(cursor);
    cursor = nextDay(cursor);
  }
  return gunler;
}

async function graphGet(path, params = {}, accessToken = null) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", accessToken || getToken());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.error) {
    // Graph API hatasını olduğu gibi yukarı fırlatıyoruz, çağıran taraf loglayıp karar versin
    throw new Error(`Graph API error: ${json.error.message} (code ${json.error.code})`);
  }
  return json;
}

/**
 * Sayfa insights gibi Page-scoped endpoint'ler sistem kullanıcısı token'ıyla değil,
 * o sayfaya özel Page Access Token ile çağrılmak zorunda (Graph API code 190 hatası aksi halde).
 */
async function getPageAccessToken(pageId) {
  const data = await graphGet(`/${pageId}`, { fields: "access_token" });
  if (!data.access_token) {
    throw new Error(`${pageId} için Page Access Token alınamadı (sistem kullanıcısının bu sayfaya erişimi olmayabilir)`);
  }
  return data.access_token;
}

/**
 * Sistem kullanıcısı token'ının erişebildiği tüm Facebook Sayfalarını listeler.
 * Yeni marka eklerken "brands" tablosuna kaydedilecek Page ID'leri bulmak için kullanışlı.
 */
export async function listAccessiblePages() {
  const data = await graphGet("/me/accounts", { fields: "id,name,category" });
  return data.data; // [{ id, name, category }, ...]
}

/**
 * Bir Facebook Sayfasının bağlı Instagram Business hesabının ID'sini bulur (varsa).
 */
export async function getInstagramAccountId(pageId) {
  const data = await graphGet(`/${pageId}`, {
    fields: "instagram_business_account",
  });
  return data.instagram_business_account?.id || null;
}

/**
 * Facebook Sayfası için günlük insights + takipçi sayısı çeker.
 * since/until formatı: "YYYY-MM-DD"
 */
export async function fetchPageInsights(pageId, since, until) {
  // NOT: 11 Eylül 2026'da doğrudan Graph API'ye karşı test edildi — "page_views_total" deprecated
  // DEĞİL, hem tek başına hem "page_post_engagements" ile birlikte sorunsuz veri dönüyor.
  // (Önceki bir düzeltme denemesinde yanlışlıkla deprecated sanılıp kaldırılmıştı, geri eklendi.)
  //
  // NOT (12 Eylül 2026): "Bağlantı Tıklamaları" için page_total_actions eklendi. Bu,
  // app/api/debug/facebook-metrics-test ile canlıda 3 gerçek sayfaya (Sayın A.Ş.,
  // Sayın Sigorta, Pomacer) karşı test edilip doğrulanan TEK geçerli aday oldu.
  // Aynı testte denenip (#100) "The value must be a valid insights metric" hatasıyla
  // reddedilen (yani BUGÜN Graph API'de artık geçersiz) adaylar: page_impressions,
  // page_impressions_unique, page_impressions_nonviral, views, page_fan_adds,
  // page_fan_adds_unique, page_fan_removes. Bu yüzden Facebook için "Görüntülemeler"
  // ve "Erişim" şu an Graph API'den hiçbir şekilde alınamıyor — tahmini bir metrik
  // adıyla doldurulmadı; lib/reportUtils.js bu ikisini Facebook'ta bilinçli olarak
  // "ölçülemiyor" (null) gösteriyor. "Takipçiler" (net değişim) için de Meta'da
  // geçerli bir günlük metrik bulunamadı — bunun yerine reportUtils.js zaten
  // güvenilir şekilde akan günlük toplam takipçi sayısından (followers, aşağıda)
  // dönem içi net değişimi kendi hesaplıyor.
  const pageToken = await getPageAccessToken(pageId);

  const [insightsData, fanData] = await Promise.all([
    graphGet(
      `/${pageId}/insights`,
      {
        metric: "page_post_engagements,page_views_total,page_total_actions",
        period: "day",
        since,
        until,
      },
      pageToken
    ),
    graphGet(`/${pageId}`, { fields: "followers_count" }, pageToken),
  ]);

  return {
    followers: fanData.followers_count ?? null,
    raw: insightsData.data,
  };
}

/**
 * Instagram Business hesabı için günlük insights + takipçi sayısı çeker.
 */
export async function fetchInstagramInsights(igAccountId, since, until) {
  // NOT: "impressions" yerine "reach" kullanılıyor — reach period=day için günlük seri destekliyor
  // ve pratikte impressions'ın yerini iyi tutuyor.
  // NOT: "profile_views", "total_interactions" (içerik etkileşimleri) ve "website_clicks"
  // (bağlantı tıklamaları) period=day için değil, metric_type=total_value (since/until aralığının
  // tek toplamı) olarak isteniyor. "reach" ve "follower_count" hâlâ günlük seri destekliyor.
  //
  // NOT (14 Eylül 2026 ile düzeltildi): total_value tekniği since..until aralığının SADECE TEK BİR
  // toplamını verdiği için, önceki kod bunu aralığın son gününe (until) yazıyordu — aralıktaki diğer
  // tüm günler bu üç alan için kalıcı olarak NULL kalıyordu (gerçek sıfır ile veri hiç çekilmedi
  // birbirine karışıyordu). Düzeltme: since..until aralığındaki HER gün için ayrı ayrı, zaten
  // canlıda doğrulanmış tek-günlük (nextDay tekniğiyle sıfır genişlik hatasından kaçınan) total_value
  // isteği atılıp totalsByDate = { [gün]: { profile_views, total_interactions, website_clicks } }
  // olarak toplanıyor.
  const gunler = enumerateDays(since, until);

  const [dailyData, totalsPerGun, profileData] = await Promise.all([
    graphGet(`/${igAccountId}/insights`, {
      metric: "reach,follower_count",
      period: "day",
      since,
      until,
    }),
    Promise.all(
      gunler.map((gun) =>
        graphGet(`/${igAccountId}/insights`, {
          metric: "profile_views,total_interactions,website_clicks",
          period: "day",
          metric_type: "total_value",
          since: gun,
          until: nextDay(gun),
        }).then((data) => ({ gun, data: data.data }))
      )
    ),
    graphGet(`/${igAccountId}`, { fields: "followers_count" }),
  ]);

  // NOT: Bir metrik o gün 0 ise Graph API onu data dizisine hiç koymuyor (eksik değil, gerçekten 0
  // demek) — bu yüzden önce hepsini 0'a set edip üzerine dönen gerçek değerlerle yazıyoruz.
  const totalsByDate = {};
  for (const { gun, data } of totalsPerGun) {
    const totals = { profile_views: 0, total_interactions: 0, website_clicks: 0 };
    for (const metric of data) {
      totals[metric.name] = metric.total_value?.value ?? 0;
    }
    totalsByDate[gun] = totals;
  }

  return {
    followers: profileData.followers_count ?? null,
    raw: dailyData.data,
    totalsByDate,
  };
}
