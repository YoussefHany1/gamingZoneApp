const axios = require("axios");
const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");
require("dotenv").config({ path: "E:\\Programing\\GamingZone2\\.env" });

// Appwrite SDK
const { Client, Databases, Query } = require("node-appwrite");

// Optional Firebase Admin for FCM
let admin = null;
try {
  admin = require("firebase-admin");
} catch (e) {
  admin = null;
}

// --- CONFIGURATION & CONSTANTS ---
const CONFIG = {
  COLLECTION_RSS: process.env.RSS_COLLECTION_ID || "news_sources",
  COLLECTION_ARTICLES: process.env.ARTICLES_COLLECTION_ID || "articles",
  MAX_CONCURRENCY: 5,
  RECENT_IDS_LIMIT: 30,
  AXIOS_TIMEOUT: 20000,
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
};

// --- INIT PARSER ---
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

// --- INIT Appwrite client ---
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// --- INIT Firebase Admin ---
let fcmEnabled = false;
if (admin && process.env.FCM_SERVICE_ACCOUNT) {
  try {
    const svc = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(svc),
      projectId: svc.project_id,
    });
    fcmEnabled = true;
    console.log("✅ Firebase Admin initialized for messaging (FCM).");
  } catch (e) {
    console.warn("⚠️ Firebase Admin init failed:", e.message);
    fcmEnabled = false;
  }
} else {
  console.log("ℹ️ Firebase Admin not configured.");
}

// --- UTILS ---
// دالة لحذف المعاملات المتغيرة (Query Params) من الرابط لضمان ثبات المعرف
const cleanUrl = (url) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    // نأخذ فقط المسار والأصل، ونتجاهل ?utm_... وما بعدها
    return u.origin + u.pathname;
  } catch (e) {
    return url ? String(url).split("?")[0] : "";
  }
};
const sha1 = (input) =>
  crypto
    .createHash("sha1")
    .update(String(input || ""))
    .digest("hex");

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

const extractThumbnail = (item) => {
  if (!item) return null;
  const getImgFromHtml = (html) =>
    (html || "").match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];

  return (
    (item.thumbnail &&
      (Array.isArray(item.thumbnail) ? item.thumbnail[0] : item.thumbnail)) ||
    item.image ||
    item["media:content"]?.url ||
    (Array.isArray(item["media:content"]) && item["media:content"][0]?.url) ||
    item["media:thumbnail"]?.url ||
    getImgFromHtml(item.description) ||
    getImgFromHtml(item["content:encoded"]) ||
    (item.enclosure &&
      (Array.isArray(item.enclosure)
        ? item.enclosure[0]?.url
        : item.enclosure.url)) ||
    null
  );
};

// --- RSS fetch + parse ---
async function fetchFeed(url) {
  try {
    const res = await axios.get(url, {
      timeout: CONFIG.AXIOS_TIMEOUT,
      maxRedirects: 20,
      headers: {
        "User-Agent": CONFIG.USER_AGENT,
        Accept:
          "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });
    return await parser.parseStringPromise(res.data);
  } catch (error) {
    const status = error.response ? error.response.status : "N/A";
    throw new Error(`Fetch failed: ${error.message} (Status: ${status})`);
  }
}

function normalizeItems(parsedData) {
  if (!parsedData) return [];
  const channel = parsedData.rss?.channel || parsedData.feed || parsedData;
  if (!channel) return [];

  let items = channel.item || channel.entry || [];
  if (!Array.isArray(items)) items = [items];

  return items
    .map((item) => {
      const link =
        item.link?._ ||
        item.link ||
        (typeof item.link === "object" && item.link.href) ||
        item.guid?._ ||
        item.guid;
      if (!link) return null;

      const title =
        typeof item.title === "string"
          ? item.title
          : item.title?._ || "No Title";
      const description = item.description
        ? he.decode(striptags(String(item.description))).trim()
        : item.summary
        ? he.decode(striptags(String(item.summary))).trim()
        : "";
      const guidContent =
        (typeof item.guid === "string" ? item.guid : item.guid?._) || link;

      const pubDateRaw =
        item.pubDate || item["dc:date"] || item.published || item.updated;
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
      const stableIdSource = cleanUrl(guidContent);
      return {
        title,
        link,
        description: description.replace(/\s+/g, " "),
        pubDate,
        thumbnail: extractThumbnail(item),
        guid: guidContent,
        docId: sha1(stableIdSource).substring(0, 36),
      };
    })
    .filter(Boolean);
}

// --- Notifications (Fixed) ---
async function sendNotifications(articles, summary) {
  if (!articles.length) return;
  if (!fcmEnabled) {
    console.log("ℹ️ Skipping notifications (FCM not configured).");
    return;
  }

  const BATCH_SIZE = 20;
  console.log(`🔔 Sending ${articles.length} notifications...`);

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);
    const promises = chunk.map(async (article) => {
      let imageLink = article.thumbnail || "";
      const isValidUrl = (url) => {
        try {
          const u = new URL(url);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch (e) {
          return false;
        }
      };

      if (!isValidUrl(imageLink)) {
        imageLink = "";
      } else {
        // تنظيف رابط الصورة أحياناً يساعد
        imageLink = imageLink.trim();
      }

      // 🛠️ LOG: طباعة الرابط للتأكد أثناء التشغيل (اختياري)
      // console.log(
      //   `Preparing notification for: ${article.title} | Image: ${imageLink}`
      // );

      // 🛠️ FIX 1: تحسين هيكل الرسالة ليظهر الصورة بشكل صحيح
      const message = {
        topic: article.topicName,
        notification: {
          title: article.title.substring(0, 100),
          body: article.description.substring(0, 100),
          // الصورة هنا تدعمها بعض المكتبات الحديثة
          ...(imageLink && { image: imageLink }),
        },
        data: {
          articleId: article.docId,
          link: article.link,
          // نضع الصورة في data أيضًا لأن التطبيق قد يحتاجها
          image: imageLink || "",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          notification: {
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            channelId: "news_notifications",
            // المفتاح الرسمي للأندرويد في FCM هو image
            ...(imageLink ? { image: imageLink } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              "mutable-content": 1, // ضروري لظهور الصور في iOS
            },
          },
          fcm_options: {
            // المفتاح الرسمي للـ iOS في FCM
            ...(imageLink && { image: imageLink }),
          },
        },
      };

      try {
        await admin.messaging().send(message);
        summary.notificationsSent++;
      } catch (error) {
        console.error(
          `❌ Notification Error (${article.siteName}):`,
          error.message
        );
        summary.errors.push({
          type: "notification",
          msg: error.message,
          site: article.siteName,
        });
      }
    });

    await Promise.allSettled(promises);
  }
}

// --- Helper: getExistingIds ---
async function getExistingIds(sourceDocData, category, siteName) {
  if (sourceDocData?.recentIds && Array.isArray(sourceDocData.recentIds)) {
    return new Set(sourceDocData.recentIds);
  }

  console.log(
    `⚠️ [Migration] Fetching legacy IDs from Appwrite articles for ${siteName}...`
  );
  const ids = new Set();

  try {
    const resp = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_ARTICLES,
      [
        Query.equal("category", category),
        Query.equal("siteName", siteName),
        Query.orderDesc("fetchedAt"),
        Query.limit(CONFIG.RECENT_IDS_LIMIT),
      ]
    );

    (resp.documents || []).forEach((d) => {
      if (d.$id) ids.add(d.$id);
    });
  } catch (e) {
    // ignore
  }

  return ids;
}

// --- Process a single source ---
async function processSource(sourceData, summary) {
  const { rssUrl, category, name, docId, raw: rawSourceData } = sourceData;
  const categorySanitized = safeId(category || "uncategorized");
  const siteNameSanitized = safeId(name || docId);

  try {
    console.log(`📥 Fetching: ${name || rssUrl}`);
    const parsed = await fetchFeed(rssUrl);
    const items = normalizeItems(parsed);

    if (!items.length) return;

    const existingIds = await getExistingIds(rawSourceData, category, name);
    // تصفية العناصر التي نعرف أنها موجودة من قائمة recentIds
    const newItems = items.filter((item) => !existingIds.has(item.docId));

    if (newItems.length === 0) {
      console.log(`   No new articles for ${name}.`);
      try {
        await databases.updateDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_RSS,
          docId,
          { lastFetchedAt: new Date().toISOString() }
        );
      } catch (e) {}
      return;
    }

    console.log(`   Found ${newItems.length} potential new articles.`);

    const allIds = [
      ...newItems.map((i) => i.docId),
      ...Array.from(existingIds),
    ];
    const updatedRecentIds = allIds.slice(0, CONFIG.RECENT_IDS_LIMIT);

    const articlesForNotify = [];

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
        language: rawSourceData?.language || "en",
      };

      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      let isTrulyNew = false; // 🛠️ FIX 2: متغير للتحقق مما إذا كان المقال جديداً فعلاً

      try {
        await databases.createDocument(
          CONFIG.APPWRITE_DATABASE_ID,
          CONFIG.COLLECTION_ARTICLES,
          item.docId,
          payload
        );
        summary.articlesUpserted++;
        isTrulyNew = true; // تم الإنشاء بنجاح، إذن هو جديد
      } catch (err) {
        // إذا كان الخطأ أن المستند موجود، نقوم بالتحديث ولكن لا نرسل إشعاراً
        const msg = err.message || String(err);
        if (msg.includes("document already exists") || err.code === 409) {
          try {
            await databases.updateDocument(
              CONFIG.APPWRITE_DATABASE_ID,
              CONFIG.COLLECTION_ARTICLES,
              item.docId,
              payload
            );
            // لاحظ: لم نقم بتعيين isTrulyNew = true هنا، لأن الخبر موجود مسبقاً
          } catch (uErr) {
            console.error("Update failed:", uErr.message);
          }
        } else {
          console.error("Create article failed:", msg);
          summary.errors.push({ site: rssUrl, msg });
        }
      }

      // 🛠️ FIX 2: إضافة المقال للإشعارات فقط إذا تم إنشاؤه لأول مرة
      if (isTrulyNew) {
        articlesForNotify.push({
          ...item,
          ...payload,
          topicName: `${categorySanitized}_${siteNameSanitized}`,
        });
      }
    }

    try {
      await databases.updateDocument(
        CONFIG.APPWRITE_DATABASE_ID,
        CONFIG.COLLECTION_RSS,
        docId,
        {
          lastFetchedAt: new Date().toISOString(),
          recentIds: updatedRecentIds,
        }
      );
    } catch (e) {
      console.warn("Could not update rss doc recentIds:", e.message);
    }

    // إرسال الإشعارات للقائمة المفلترة فقط
    await sendNotifications(articlesForNotify, summary);
  } catch (error) {
    console.error(`❌ Error processing ${name}: ${error.message}`);
    summary.errors.push({ site: rssUrl, msg: error.message });
  }
}

// --- MAIN RUNNER ---
async function run() {
  console.log("🚀 Starting RSS Fetcher (Appwrite)...");
  const summary = {
    sourcesProcessed: 0,
    articlesUpserted: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    const sourcesResp = await databases.listDocuments(
      CONFIG.APPWRITE_DATABASE_ID,
      CONFIG.COLLECTION_RSS,
      [Query.limit(1000)]
    );

    const docs = sourcesResp.documents || [];
    if (!docs.length) {
      console.log("No sources found.");
      process.exit(0);
    }

    const sources = docs.map((doc) => ({
      docId: doc.$id,
      rssUrl: doc.rssUrl,
      name: doc.name,
      category: doc.category,
      raw: doc,
    }));

    summary.sourcesProcessed = sources.length;

    for (let i = 0; i < sources.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = sources.slice(i, i + CONFIG.MAX_CONCURRENCY);
      await Promise.all(chunk.map((s) => processSource(s, summary)));
    }
  } catch (error) {
    console.error("Fatal Error:", error);
    process.exit(1);
  }

  console.log("\n--- 📊 FINAL SUMMARY ---");
  console.log(`Sources: ${summary.sourcesProcessed}`);
  console.log(`New Articles: ${summary.articlesUpserted}`);
  console.log(`Notifications: ${summary.notificationsSent}`);
  console.log(`Errors: ${summary.errors.length}`);

  process.exit(0);
}

run();
