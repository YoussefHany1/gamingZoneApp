const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");

// --- CONFIGURATION & CONSTANTS ---
const CONFIG = {
  COLLECTION_RSS: "rss",
  COLLECTION_ARTICLES: "articles",
  MAX_CONCURRENCY: 5, // عدد المصادر التي تتم معالجتها في وقت واحد
  BATCH_SIZE: 400, // حجم الدفعة للكتابة في Firestore
  RECENT_IDS_LIMIT: 30, // عدد المعرفات المحفوظة في مستند المصدر لمنع التكرار
  AXIOS_TIMEOUT: 20000,
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};

// --- INITIALIZATION ---
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

// Initialize Firebase Admin
const initFirebase = () => {
  if (admin.apps.length) return admin.firestore();

  let serviceAccount = null;
  try {
    if (process.env.SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
    } else {
      serviceAccount = require("../serviceAccountKey.json");
    }
  } catch (e) {
    console.warn(
      "⚠️ Warning: Service account not found, trying default credentials."
    );
  }

  const options = { projectId: process.env.FIREBASE_PROJECT_ID };
  if (serviceAccount) {
    options.credential = admin.credential.cert(serviceAccount);
  } else {
    options.credential = admin.credential.applicationDefault();
  }

  admin.initializeApp(options);
  return admin.firestore();
};

const db = initFirebase();

// --- UTILS ---

/** Generates a SHA1 hash for consistency. */
const sha1 = (input) =>
  crypto
    .createHash("sha1")
    .update(String(input || ""))
    .digest("hex");

/** Sanitizes strings for Firestore IDs. */
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

/** Extracts image URL from various RSS fields. */
const extractThumbnail = (item) => {
  if (!item) return null;

  const getImgFromHtml = (html) =>
    (html || "").match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];

  return (
    item.thumbnail ||
    item.thumbnail?.[0] ||
    item.image ||
    item["media:content"]?.url ||
    item["media:content"]?.[0]?.url ||
    item["media:thumbnail"]?.url ||
    item["media:thumbnail"]?.[0]?.url ||
    item.enclosure?.url ||
    item.enclosure?.[0]?.url ||
    getImgFromHtml(item.description) ||
    getImgFromHtml(item["content:encoded"]) ||
    null
  );
};

// --- CORE FUNCTIONS ---

/**
 * Fetches and parses RSS feed.
 */
async function fetchFeed(url) {
  try {
    const res = await axios.get(url, {
      timeout: CONFIG.AXIOS_TIMEOUT,
      maxRedirects: 20, // زيادة عدد مرات إعادة التوجيه المسموح بها
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

/**
 * Normalizes raw RSS items into a consistent structure.
 */
function normalizeItems(parsedData) {
  if (!parsedData || !parsedData.rss) return [];
  const channel = parsedData.rss?.channel;
  if (!channel) return [];

  let items = channel.item || [];
  if (!Array.isArray(items)) items = [items];

  return items
    .map((item) => {
      const link = item.link?._ || item.link || item.guid?._ || item.guid;
      if (!link) return null;

      const title = typeof item.title === "string" ? item.title : "No Title";
      const description = item.description
        ? he.decode(striptags(String(item.description))).trim()
        : "";
      const guidContent =
        (typeof item.guid === "string" ? item.guid : item.guid?._) || link;

      return {
        title,
        link,
        description: description.replace(/\s+/g, " "),
        pubDate:
          item.pubDate || item["dc:date"]
            ? new Date(item.pubDate || item["dc:date"])
            : null,
        thumbnail: extractThumbnail(item),
        guid: guidContent,
        docId: sha1(guidContent), // Unique ID based on content
      };
    })
    .filter(Boolean); // Remove nulls
}

/**
 * Sends FCM notifications in parallel.
 */
async function sendNotifications(articles, summary) {
  if (!articles.length) return;
  console.log(`🔔 Sending ${articles.length} notifications...`);
  const BATCH_SIZE = 20;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);
    const promises = chunk.map(async (article) => {
      const imageLink = article.thumbnail || "";
      const isValidUrl = (url) => {
        try {
          return (
            Boolean(new URL(url)) &&
            (url.startsWith("http://") || url.startsWith("https://"))
          );
        } catch (e) {
          return false;
        }
      };

      if (!isValidUrl(imageLink)) {
        imageLink = "";
      }
      const safeSiteName = safeId(article.siteName);
      const safeCategory = safeId(article.category);
      // const topicName = `${safeCategory}_${safeSiteName}`;

      const message = {
        topic: article.topicName,
        notification: {
          title: article.title.substring(0, 100),
          body: article.description.substring(0, 100),
          ...(imageLink && { imageUrl: imageLink }),
        },
        data: {
          articleId: article.docId,
          link: article.link,
          image: imageLink || "",
          // category: article.category || "",
          // siteName: article.siteName || "",
          // pubDate: article.pubDate ? article.pubDate.toISOString() : new Date().toISOString(),
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          notification: {
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            channelId: "news_notifications",
            ...(imageLink ? { imageUrl: imageLink } : {}),
          },
        },
        apns: {
          payload: { aps: { "mutable-content": 1 } },
          fcm_options: { ...(imageLink && { image: imageLink }) },
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
/**
 * Helper: Get recent IDs.
 * Optimization: First check `source.recentIds` (in-memory).
 * Fallback: Query Firestore (legacy support for first run).
 */
async function getExistingIds(sourceDocData, category, siteName) {
  // 1. Fast Path: Check directly in source document data
  if (sourceDocData.recentIds && Array.isArray(sourceDocData.recentIds)) {
    return new Set(sourceDocData.recentIds);
  }

  // 2. Slow Path (Fallback): Query the articles sub-collection
  // This only happens once per source until the new 'recentIds' field is populated.
  console.log(
    `⚠️ [Migration] Fetching legacy IDs from Firestore for ${siteName}...`
  );
  const ids = new Set();
  try {
    const snapshot = await db
      .collection(CONFIG.COLLECTION_ARTICLES)
      .doc(category)
      .collection("sources")
      .doc(siteName)
      .collection("posts")
      .orderBy("fetchedAt", "desc")
      .limit(CONFIG.RECENT_IDS_LIMIT)
      .get();

    snapshot.forEach((doc) => ids.add(doc.id));
  } catch (e) {
    // Ignore if collection doesn't exist
  }
  return ids;
}

/**
 * Processes a single source.
 */
async function processSource(sourceData, summary) {
  const { rssUrl, category, name, docId, raw: rawSourceData } = sourceData;
  const categorySanitized = safeId(category || "uncategorized");
  const siteNameSanitized = safeId(name || docId);

  try {
    // 1. Fetch & Parse
    console.log(`📥 Fetching: ${name || rssUrl}`);
    const parsed = await fetchFeed(rssUrl);
    const items = normalizeItems(parsed);

    if (!items.length) return;

    // 2. Deduplication (Optimized)
    const existingIds = await getExistingIds(
      rawSourceData,
      categorySanitized,
      siteNameSanitized
    );
    const newItems = items.filter((item) => !existingIds.has(item.docId));

    if (newItems.length === 0) {
      console.log(`   No new articles for ${name}.`);
      // Update timestamp only to show we checked
      await db.collection(CONFIG.COLLECTION_RSS).doc(docId).update({
        lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    console.log(`   Found ${newItems.length} new articles.`);

    // 3. Write to Firestore (Batched) & Prepare Notifications
    const batch = db.batch();
    const articlesForNotify = [];

    // Prepare list of IDs to save back to Source Doc (for future caching)
    // Merge new IDs with existing IDs, keep top N
    const allIds = [...newItems.map((i) => i.docId), ...existingIds];
    const updatedRecentIds = allIds.slice(0, CONFIG.RECENT_IDS_LIMIT);

    newItems.forEach((item) => {
      const docRef = db
        .collection(CONFIG.COLLECTION_ARTICLES)
        .doc(categorySanitized)
        .collection("sources")
        .doc(siteNameSanitized)
        .collection("posts")
        .doc(item.docId);

      const payload = {
        ...item,
        pubDate: item.pubDate
          ? admin.firestore.Timestamp.fromDate(item.pubDate)
          : null,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        siteName: name,
        category: category,
        siteImage: rawSourceData.image || null,
        language: rawSourceData.language || "en",
      };

      // Remove keys undefined to avoid Firestore errors
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key]
      );

      batch.set(docRef, payload, { merge: true });

      articlesForNotify.push({
        ...item,
        ...payload,
        topicName: `${categorySanitized}_${siteNameSanitized}`,
      });
    });

    // 4. Update Source Document (Atomically update lastFetchedAt AND recentIds)
    // This saves us from querying the posts collection next time!
    const sourceRef = db.collection(CONFIG.COLLECTION_RSS).doc(docId);
    batch.update(sourceRef, {
      lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      recentIds: updatedRecentIds, // <--- The Key Optimization
    });

    // Commit Batch
    await batch.commit();
    summary.articlesUpserted += newItems.length;

    // 5. Send Notifications
    await sendNotifications(articlesForNotify, summary);
  } catch (error) {
    console.error(`❌ Error processing ${name}: ${error.message}`);
    summary.errors.push({ site: rssUrl, msg: error.message });
  }
}

// --- MAIN RUNNER ---

async function run() {
  console.log("🚀 Starting RSS Fetcher...");
  const summary = {
    sourcesProcessed: 0,
    articlesUpserted: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    // 1. Read All Sources
    const sourcesSnapshot = await db.collection(CONFIG.COLLECTION_RSS).get();
    if (sourcesSnapshot.empty) {
      console.log("No sources found.");
      process.exit(0);
    }

    const sources = [];
    sourcesSnapshot.forEach((doc) => {
      const data = doc.data();
      // Helper to extract sources from flexible structure
      const extract = (entry, cat) => {
        if (!entry) return;
        const url = entry.rssUrl || entry.url || entry.feed || entry.link;
        if (url) {
          sources.push({
            docId: doc.id,
            rssUrl: url,
            name: entry.name || entry.title || "Unknown",
            category: cat || entry.category || null,
            raw: data, // Pass full data to access existing recentIds
          });
        }
      };

      // Handle Arrays or Objects inside the RSS doc
      if (Array.isArray(data)) {
        data.forEach((e) => extract(e, null));
      } else {
        Object.keys(data).forEach((key) => {
          if (key === "recentIds" || key === "lastFetchedAt") return; // Skip metadata
          const val = data[key];
          if (Array.isArray(val)) val.forEach((v) => extract(v, key));
          else if (typeof val === "object") extract(val, key);
        });
        // Direct root check
        if (!sources.length) extract(data, null);
      }
    });

    summary.sourcesProcessed = sources.length;

    // 2. Process with Worker Pool
    // Split sources into chunks to respect concurrency
    for (let i = 0; i < sources.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = sources.slice(i, i + CONFIG.MAX_CONCURRENCY);
      await Promise.all(chunk.map((source) => processSource(source, summary)));
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

// Start
run();
