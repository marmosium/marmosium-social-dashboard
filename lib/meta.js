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
  // NOT: "page_impressions" 15 Kasım 2025 itibarıyla tüm API versiyonlarında deprecated edildi,
  // bu yüzden burada istenmiyor (isteğe eklenirse Graph API "invalid insights metric" hatası döner).
  const pageToken = await getPageAccessToken(pageId);

  const [insightsData, fanData] = await Promise.all([
    graphGet(
      `/${pageId}/insights`,
      {
        metric: "page_post_engagements",
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
  // NOT: "impressions" 21 Nisan 2025'te deprecated edildi, yerine "views" metriği kullanılıyor.
  // NOT: "views", "profile_views", "total_interactions" (içerik etkileşimleri) ve "website_clicks"
  // (bağlantı tıklamaları) artık period=day için günlük seri değil, metric_type=total_value
  // (since/until aralığının tek toplamı) olarak isteniyor.
  // "reach" ve "follower_count" (günlük net takipçi değişimi) hâlâ günlük seri destekliyor.
  const [dailyData, totalsData, profileData] = await Promise.all([
    graphGet(`/${igAccountId}/insights`, {
      metric: "reach,follower_count",
      period: "day",
      since,
      until,
    }),
    // NOT: Bu total_value çağrısı bilerek since=until=until (tek gün) ile yapılıyor, since..until
    // (7 gün) ile DEĞİL. Sync her gün çalıştığında bu değer "until" gününün satırına yazılıyor;
    // eğer 7 günlük aralığın toplamını kullansaydık, ardışık günlerde çakışan pencereler yüzünden
    // aynı veri tekrar tekrar sayılıp (7 kata kadar) yanlış aylık toplamlar ortaya çıkardı.
    graphGet(`/${igAccountId}/insights`, {
      metric: "profile_views,total_interactions,website_clicks",
      period: "day",
      metric_type: "total_value",
      since: until,
      until,
    }),
    graphGet(`/${igAccountId}`, { fields: "followers_count" }),
  ]);

  // NOT: Bir metrik o gün 0 ise Graph API onu data dizisine hiç koymuyor (eksik değil, gerçekten 0
  // demek) — bu yüzden önce hepsini 0'a set edip üzerine dönen gerçek değerlerle yazıyoruz.
  const totals = { profile_views: 0, total_interactions: 0, website_clicks: 0 };
  for (const metric of totalsData.data) {
    totals[metric.name] = metric.total_value?.value ?? 0;
  }

  return {
    followers: profileData.followers_count ?? null,
    raw: dailyData.data,
    totals,
  };
}
