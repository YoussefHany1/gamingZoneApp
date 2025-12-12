const axios = require("axios");
const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");
require("dotenv").config({ path: "E:\\Programing\\GamingZone2\\.env" });

const { Client, Databases, Query, ID } = require("node-appwrite");

let admin = null;
try {
  admin = require("firebase-admin");
} catch (e) {
  admin = null;
}

// --- CONFIGURATION ---
const CONFIG = {
  COLLECTION_RSS: process.env.RSS_COLLECTION_ID || "news_sources",
  COLLECTION_ARTICLES: process.env.ARTICLES_COLLECTION_ID || "articles",
  MAX_CONCURRENCY: 3,

  // الحد الأقصى للأخبار المخزنة (سواء عناوين أو مستندات)
  MAX_STORED_NEWS: 40,

  // نحتفظ بذاكرة أكبر قليلاً للمعرفات لمنع تكرار الإشعارات للأخبار المحذوفة حديثاً
  RECENT_IDS_LIMIT: 100,

  AXIOS_TIMEOUT: 30000,
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
};

// --- INIT ---
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

let fcmEnabled = false;
if (admin && process.env.FCM_SERVICE_ACCOUNT) {
  try {
    const svc = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(svc),
      projectId: svc.project_id,
    });
    fcmEnabled = true;
    console.log("✅ Firebase Admin initialized.");
  } catch (e) {
    console.warn("⚠️ Firebase error:", e.message);
  }
}

// --- HELPERS ---
const generateDocId = (item) => {
  if (item.id || item.guid) {
    return crypto
      .createHash("sha1")
      .update(String(item.id || item.guid))
      .digest("hex")
      .substring(0, 36);
  }
  if (item.link) {
    return crypto
      .createHash("sha1")
      .update(String(item.link))
      .digest("hex")
      .substring(0, 36);
  }
  const safeTitle = (item.title || "unknown").trim().toLowerCase();
  return crypto
    .createHash("sha1")
    .update(safeTitle)
    .digest("hex")
    .substring(0, 36);
};

const safeId = (input) => {
  if (!input) return "unknown";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const resolveImageUrl = (img, baseUrl) => {
  if (!img || typeof img !== "string") return null;
  let finalUrl = img.trim();
  if (finalUrl.startsWith("//")) finalUrl = "https:" + finalUrl;
  if (finalUrl.startsWith("/")) {
    try {
      const u = new URL(baseUrl);
      finalUrl = u.origin + finalUrl;
    } catch (e) {}
  }
  if (finalUrl.startsWith("http:"))
    finalUrl = finalUrl.replace("http:", "https:");
  if (!finalUrl.startsWith("https")) return null;
  return finalUrl;
};

const extractThumbnail = (item, baseUrl, isJson = false) => {
  let img = null;
  if (isJson) {
    img = item.image || item.tileImage || item.thumbnail || item.img || null;
  } else {
    const getImgFromHtml = (html) =>
      (html || "").match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];
    img =
      item["media:content"]?.["media:thumbnail"]?.url ||
      (item.thumbnail &&
        (Array.isArray(item.thumbnail) ? item.thumbnail[0] : item.thumbnail)) ||
      item["media:content"]?.url ||
      item["media:thumbnail"]?.url ||
      getImgFromHtml(item.description) ||
      getImgFromHtml(item["content:encoded"]) ||
      (item.enclosure &&
        (Array.isArray(item.enclosure)
          ? item.enclosure[0]?.url
          : item.enclosure.url));
  }
  return resolveImageUrl(img, baseUrl);
};

// --- FETCHING ---
async function fetchFeed(url) {
  try {
    const res = await axios.get(url, {
      timeout: CONFIG.AXIOS_TIMEOUT,
      maxRedirects: 10,
      headers: {
        "User-Agent": CONFIG.USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8", // إضافة اللغة العربية
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
    });

    if (typeof res.data === "object" && !res.data["rss"] && !res.data["feed"]) {
      return { type: "json", data: res.data };
    }
    const parsed = await parser.parseStringPromise(res.data);
    return { type: "xml", data: parsed };
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.warn(`      ⚠️ 403 Blocked by ${url}. Consider using a proxy.`);
    }
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

function normalizeItems(fetchedContent, sourceUrl) {
  if (!fetchedContent) return [];
  const items = [];

  if (fetchedContent.type === "json") {
    const data = fetchedContent.data;
    let rawItems = [];
    if (data.data && data.data.br && data.data.br.motds)
      rawItems = data.data.br.motds;
    else if (Array.isArray(data.data)) rawItems = data.data;
    else if (Array.isArray(data)) rawItems = data;

    rawItems.forEach((item) => {
      items.push({
        title: item.title || "No Title",
        description: item.description || item.body || "",
        link: item.link || item.website || sourceUrl,
        thumbnail: extractThumbnail(item, sourceUrl, true),
        rawId: item.id,
        pubDate: new Date(),
      });
    });
  } else {
    const parsedData = fetchedContent.data;
    const channel = parsedData.rss?.channel || parsedData.feed || parsedData;
    let rawItems = channel.item || channel.entry || [];
    if (!Array.isArray(rawItems)) rawItems = [rawItems];

    rawItems.forEach((item) => {
      const link =
        item.link?._ ||
        item.link ||
        (typeof item.link === "object" && item.link.href) ||
        item.guid?._ ||
        item.guid;
      if (!link) return;
      const description = item.description
        ? he.decode(striptags(String(item.description))).trim()
        : item.summary
        ? he.decode(striptags(String(item.summary))).trim()
        : "";

      const pubDateRaw =
        item.pubDate || item["dc:date"] || item.published || item.updated;
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : new Date();

      items.push({
        title:
          typeof item.title === "string"
            ? item.title
            : item.title?._ || "No Title",
        description: description.replace(/\s+/g, " "),
        link: link,
        thumbnail: extractThumbnail(item, sourceUrl, false),
        guid:
          (typeof item.guid === "string" ? item.guid : item.guid?._) || link,
        pubDate: pubDate,
      });
    });
  }

  return items.map((item) => ({
    ...item,
    docId: generateDocId(item),
  }));
}

// --- NOTIFICATIONS ---
async function sendNotifications(articles, summary) {
  if (!articles.length || !fcmEnabled) return;
  console.log(`🔔 Sending ${articles.length} notifications...`);
  const BATCH_SIZE = 10;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      chunk.map(async (article) => {
        const imageLink = article.thumbnail || "";
        const message = {
          topic: article.topicName,
          notification: {
            title: article.title.substring(0, 150),
            body: article.description.substring(0, 150),
            ...(imageLink && { image: imageLink }),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "news_notifications",
              ...(imageLink && { image: imageLink }),
            },
          },
          data: {
            link: article.link || "",
            image: imageLink || "",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        };
        try {
          await admin.messaging().send(message);
          summary.notificationsSent++;
          console.log(`   -> Sent: ${article.title.substring(0, 30)}...`);
        } catch (e) {
          console.error(`   -> Failed: ${e.message}`);
        }
      })
    );
  }
}

// --- MAIN PROCESS LOGIC ---
async function processSource(sourceData, summary) {
  const { rssUrl, category, name, docId, raw: rawSourceData } = sourceData;
  const topicName = `${safeId(category)}_${safeId(name)}`;

  try {
    console.log(`📥 Processing: ${name}`);
    const fetched = await fetchFeed(rssUrl);
    let items = normalizeItems(fetched, rssUrl);

    if (!items.length) return;

    // إزالة التكرار الداخلي
    const uniqueMap = new Map();
    items.forEach((i) => uniqueMap.set(i.docId, i));
    items = Array.from(uniqueMap.values());

    // تحديد الأخبار الجديدة
    const existingIds = new Set(rawSourceData.recentIds || []);
    const newItems = items.filter((i) => !existingIds.has(i.docId));

    // =========================================================
    // BRANCH A: API (JSON) -> تخزين العناوين فقط (حد أقصى 40)
    // =========================================================
    if (fetched.type === "json") {
      let finalTitles = [];
      if (
        !rawSourceData.latestTitles ||
        rawSourceData.latestTitles.length === 0
      ) {
        finalTitles = items
          .map((i) => i.title)
          .slice(0, CONFIG.MAX_STORED_NEWS);
      } else {
        const storedTitles = rawSourceData.latestTitles || [];
        const newTitles = newItems.map((i) => i.title);
        // إضافة الجديد أولاً ثم القديم، والاحتفاظ بأول 40 فقط
        finalTitles = [...newTitles, ...storedTitles].slice(
          0,
          CONFIG.MAX_STORED_NEWS
        );
      }

      const allIds = items.map((i) => i.docId);
      const updatedRecentIds = Array.from(
        new Set([...allIds, ...existingIds])
      ).slice(0, CONFIG.RECENT_IDS_LIMIT);

      await databases.updateDocument(
        CONFIG.APPWRITE_DATABASE_ID,
        CONFIG.COLLECTION_RSS,
        docId,
        {
          lastFetchedAt: new Date().toISOString(),
          latestTitles: finalTitles,
          recentIds: updatedRecentIds,
        }
      );
    }
    // =========================================================
    // BRANCH B: RSS (XML) -> تخزين مستندات كاملة (حد أقصى 40)
    // =========================================================
    else {
      // 1. إضافة الأخبار الجديدة
      for (const item of newItems) {
        const payload = {
          title: item.title,
          link: item.link,
          description: item.description,
          pubDate: item.pubDate ? item.pubDate.toISOString() : null,
          thumbnail: item.thumbnail || null,
          guid: item.guid,
          fetchedAt: new Date().toISOString(),
          siteName: name,
          category: category,
          siteImage: rawSourceData?.image || null,
          language: rawSourceData?.language || null,
        };

        try {
          await databases.createDocument(
            CONFIG.APPWRITE_DATABASE_ID,
            CONFIG.COLLECTION_ARTICLES,
            item.docId,
            payload
          );
        } catch (err) {
          if (err.code !== 409) {
            // 409 = موجود مسبقاً
            console.error(`      ❌ Save failed: ${err.message}`);
          }
        }
      }

      // 2. تحديث recentIds في المصدر
      const allIds = items.map((i) => i.docId);
      const updatedRecentIds = Array.from(
        new Set([...allIds, ...existingIds])
      ).slice(0, CONFIG.RECENT_IDS_LIMIT);

      await databases.updateDocument(
        CONFIG.APPWRITE_DATABASE_ID,
        CONFIG.COLLECTION_RSS,
        docId,
        { lastFetchedAt: new Date().toISOString(), recentIds: updatedRecentIds }
      );

      // 3. 🧹 تنظيف المستندات القديمة (RSS Cleanup)
      // نحذف أي مستند يزيد ترتيبه عن 40 لنفس المصدر
      try {
        // نطلب المستندات الزائدة (بدءاً من رقم 41)
        const excessDocs = await databases.listDocuments(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_ARTICLES,
          [
            Query.equal("siteName", name),
            Query.orderDesc("fetchedAt"), // الأحدث أولاً
            Query.limit(50), // حجم الدفعة للحذف
            Query.offset(CONFIG.MAX_STORED_NEWS), // تجاوز أول 40 (الاحتفاظ بهم)
          ]
        );

        if (excessDocs.documents.length > 0) {
          console.log(
            `      🧹 Cleanup: Deleting ${excessDocs.documents.length} old articles for ${name}...`
          );
          const deletePromises = excessDocs.documents.map((d) =>
            databases
              .deleteDocument(
                CONFIG.APPWRITE_DATABASE_ID,
                CONFIG.COLLECTION_ARTICLES,
                d.$id
              )
              .catch((e) => console.error(`Failed to delete ${d.$id}`))
          );
          await Promise.all(deletePromises);
        }
      } catch (cleanupError) {
        console.error(`      ⚠️ Cleanup failed: ${cleanupError.message}`);
      }
    }

    // =========================================================
    // NOTIFICATIONS
    // =========================================================
    if (newItems.length > 0) {
      console.log(`   🚀 Found ${newItems.length} new articles.`);
      const notifyItems = newItems.map((i) => ({ ...i, topicName }));
      await sendNotifications(notifyItems, summary);
    } else {
      console.log(`   💤 No new articles.`);
    }
  } catch (error) {
    console.error(`❌ Error in ${name}: ${error.message}`);
    summary.errors.push({ name, msg: error.message });
  }
}

// --- RUN ---
async function run() {
  console.log("🚀 Starting Hybrid Fetcher (API & RSS)...");
  const summary = { notificationsSent: 0, errors: [] };
  try {
    const res = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_RSS,
      [Query.limit(1000)]
    );

    const sources = res.documents.map((d) => ({
      docId: d.$id,
      rssUrl: d.rssUrl,
      name: d.name,
      category: d.category,
      raw: d,
    }));

    console.log(`Found ${sources.length} sources.`);

    for (let i = 0; i < sources.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = sources.slice(i, i + CONFIG.MAX_CONCURRENCY);
      await Promise.all(chunk.map((s) => processSource(s, summary)));
    }
  } catch (e) {
    console.error("Fatal Error:", e);
  }
  console.log(
    `\n--- Done. Sent: ${summary.notificationsSent}, Errors: ${summary.errors.length} ---`
  );
  process.exit(0);
}

run();
