const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");
require("dotenv").config({ path: "E:\\Programing\\GamingZone\\.env" });

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
    const { gotScraping } = await import("got-scraping");
    const { CookieJar } = await import("tough-cookie");

    // تفعيل وضع looseMode لتقليل صرامة الكوكيز (قد يساعد في بعض الحالات)
    const cookieJar = new CookieJar(null, { looseMode: true });

    const response = await gotScraping({
      url,
      timeout: { request: CONFIG.AXIOS_TIMEOUT },
      cookieJar,
      headerGeneratorOptions: {
        locales: ["ar", "en-US"],
      },
      maxRedirects: 5,
      responseType: "buffer",
    });
    let bodyString = response.body.toString("utf8");
    if (url.includes("arabhardware") || bodyString.includes("Ø¢")) {
      try {
        const fixed = Buffer.from(bodyString, "binary").toString("utf8");
        // نتأكد أن الإصلاح أنتج نصاً عربياً صالحاً
        if (fixed.match(/[\u0600-\u06FF]/)) {
          bodyString = fixed;
        }
      } catch (e) {
        console.warn("Encoding fix failed:", e.message);
      }
    }

    return await parseResponse(bodyString);
  } catch (error) {
    // التحقق من أنواع الأخطاء التي تستدعي استخدام Puppeteer
    const isRedirectLoop =
      error.message.includes("Redirected") ||
      error.response?.statusCode === 301;
    const isBlocked =
      error.response?.statusCode === 403 || error.response?.statusCode === 503;

    const isParsingError =
      error.message.includes("Unencoded <") ||
      error.message.includes("Non-whitespace before first tag");

    // إضافة التحقق من خطأ النطاق (Cookie Domain)
    const isCookieDomainError = error.message.includes(
      "Cookie not in this host's domain"
    );

    if (isRedirectLoop || isBlocked || isCookieDomainError || isParsingError) {
      console.log(
        `      ⚠️ Protection or Domain mismatch at ${url}. Switching to Puppeteer...`
      );
      return await fetchWithPuppeteer(url);
    }

    throw new Error(`Fetch failed: ${error.message}`);
  }
}
function cleanXmlBody(body) {
  if (!body) return "";

  // 1. إصلاح علامة & التي لا تتبعها صيغة entity صحيحة
  // يحول "Radeon & Nvidia" إلى "Radeon &amp; Nvidia"
  // ويتجاهل "Tom &amp; Jerry" لأنها صحيحة
  let cleaned = body.replace(
    /&(?!(?:apos|quot|[gl]t|amp|#\d+|#x[a-f\d]+);)/gi,
    "&amp;"
  );

  // 2. إزالة الحروف غير المطبوعة (Control Characters) التي قد تسبب مشاكل
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return cleaned;
}
// دالة مساعدة لتحليل النص
async function parseResponse(body) {
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(body);
  } catch (e) {}

  if (parsedJson && !parsedJson["rss"] && !parsedJson["feed"]) {
    return { type: "json", data: parsedJson };
  }

  // محاولة التحليل الأولى (للنص الأصلي)
  try {
    const parsed = await parser.parseStringPromise(body);
    return { type: "xml", data: parsed };
  } catch (e) {
    // إذا فشل التحليل، نحاول تنظيف النص وإعادة المحاولة
    // هذا يحل مشكلة Invalid character in entity name
    try {
      const cleanedBody = cleanXmlBody(body);
      const parsedCleaned = await parser.parseStringPromise(cleanedBody);
      return { type: "xml", data: parsedCleaned };
    } catch (e2) {
      // إذا فشل حتى بعد التنظيف، نرمي الخطأ الأصلي
      throw new Error(`XML Parsing failed: ${e.message}`);
    }
  }
}

// دالة الجلب باستخدام متصفح حقيقي (Puppeteer)
// دالة الجلب باستخدام متصفح حقيقي (Puppeteer)
async function fetchWithPuppeteer(url) {
  let browser = null;
  try {
    const puppeteer = require("puppeteer");

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // بدلاً من response.text() نستخدم buffer() ثم نحوله لـ UTF-8
    // هذا يجبر الكود على قراءة الأحرف العربية بشكل صحيح
    const buffer = await response.buffer();
    let rawBody = buffer.toString("utf8");

    if (url.includes("arabhardware") || rawBody.includes("Ø¢")) {
      try {
        const fixed = Buffer.from(rawBody, "binary").toString("utf8");
        if (fixed.match(/[\u0600-\u06FF]/)) {
          rawBody = fixed;
        }
      } catch (e) {}
    }

    return await parseResponse(rawBody);
  } catch (error) {
    throw new Error(`Puppeteer failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
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

    if (
      name.toLowerCase().includes("techpowerup") ||
      rssUrl.includes("techpowerup")
    ) {
      items = items.map((item) => {
        // نستخدم العنوان كبصمة فريدة (مع تنظيفه)
        const stableKey = (item.title || "").trim().toLowerCase();
        // نعيد توليد docId
        const newDocId = crypto
          .createHash("sha1")
          .update(stableKey)
          .digest("hex")
          .substring(0, 36);
        return { ...item, docId: newDocId };
      });
    }

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
