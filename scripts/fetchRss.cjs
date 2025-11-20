// Node script to run on GitHub Actions
const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");

// --- CONSTANTS & CONFIG ---
const RSS_SERVICE_CONSTANTS = {
  COLLECTION_RSS: "rss",
  COLLECTION_ARTICLES: "articles",
  DEFAULT_CONCURRENCY: 4,
  BATCH_WRITE_SIZE: 400,
  RECENT_ARTICLES_LIMIT: 50, // 💡 Optimization: Max articles to check for existence
};

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

// --- FIREBASE ADMIN INITIALIZATION ---

let serviceAccount = null;
if (process.env.SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
  } catch (e) {
    console.warn("Failed to parse SERVICE_ACCOUNT env var; falling back.");
  }
}
if (!serviceAccount) {
  try {
    // Fallback to local file
    serviceAccount = require("../serviceAccountKey.json");
  } catch (e) {
    console.warn("serviceAccountKey.json not found; relying on ADC if available.");
  }
}

if (serviceAccount && serviceAccount.client_email) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = admin.firestore();

// --- HELPER FUNCTIONS ---

/** Generates SHA1 hash for a string. */
function sha1(input) {
  return crypto
    .createHash("sha1")
    .update(String(input || ""))
    .digest("hex");
}

/** Fetches and parses an RSS URL. */
async function fetchRss(url) {
  const res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "RSS-Fetcher/1.0 (+mailto:youssefhany.2005.yh@gmail.com)",
    },
  });
  return parser.parseStringPromise(res.data);
}

/** Sanitizes input for Firestore document ID or path part. */
function safeId(input) {
  if (!input) return null;
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\_+|\_+$/g, "");
}

/** Extracts the best available thumbnail URL from an RSS item. */
function extractThumbnail(i) {
  if (!i) return null;
  // ... [Extraction logic remains the same for correctness]
  // لو في تاق img داخل الـ description
  const descriptionImage = String(i.description).match(
    /<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i
  )?.[1];
  const contentImage = he
    .decode(String(i["content:encoded"]))
    .match(/<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i)?.[1];

  return (
    i.thumbnail ||
    i.thumbnail?.[0] ||
    i.image ||
    i.enclosure?.url ||
    i.enclosure?.[0]?.url ||
    i.enclosure?.[0]?.["url"]?.[0] ||
    i.enclosure?.link ||
    i.enclosure?.[0]?.link ||
    i["media:thumbnail"] ||
    i["media:thumbnail"]?.url ||
    i["media:thumbnail"]?.[0] ||
    i["media:thumbnail"]?.[0]?.url ||
    i["media:content"]?.["$"]?.url ||
    i["media:content"]?.url ||
    i["media:content"]?.[0]?.url ||
    i["media:content"]?.[0]?.["url"]?.[0] ||
    descriptionImage ||
    contentImage ||
    null
  );
}

/** Normalizes RSS items into a standard structure. */
function normalizeItems(parsed) {
  const items = [];
  if (parsed.rss && parsed.rss.channel) {
    let it = parsed.rss.channel.item || [];
    it = Array.isArray(it) ? it : [it];
    for (const i of it) {
      const link =
        (i.link &&
          (typeof i.link === "string" ? i.link : i.link._ || i.link.href)) ||
        (i.guid && (i.guid._ || i.guid)) ||
        null;
      const title = i.title && (typeof i.title === "string" ? i.title : "N/A");
      const description =
        he
          .decode(striptags(String(i.description)))
          .replace(/\s+/g, " ")
          .trim() ||
        i.content ||
        "";
      const pubDate = i.pubDate || i.pubdate || i["dc:date"] || null;
      const guidContent = (i.guid && (typeof i.guid === "string" ? i.guid : i.guid._ || i.guid)) || null;
      items.push({
        title,
        link,
        description,
        pubDate: pubDate ? new Date(pubDate) : null,
        thumbnail: extractThumbnail(i),
        raw: i,
        // Calculate the unique ID once here
        docId: sha1(guidContent || link || title)
      });
    }
  }
  return items.filter((it) => it.link || it.guid);
}

/** Extracts source configuration from Firestore documents. */
function extractSourcesFromDocData(data) {
  const result = [];
  if (Array.isArray(data)) {
    for (const entry of data) {
      result.push({ source: entry, category: null });
    }
    return result;
  }
  if (data && typeof data === "object") {
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val)) {
        for (const s of val) result.push({ source: s, category: key });
      } else if (
        val &&
        typeof val === "object" &&
        (val.name || val.url || val.rssUrl)
      ) {
        result.push({ source: val, category: key });
      }
    }
    if (result.length === 0 && (data.name || data.url || data.rssUrl))
      result.push({ source: data, category: null });
    return result;
  }
  return result;
}

/** 💡 Optimization: Fetches IDs of the most recently processed articles for a source. */
async function getRecentArticleIds(category, siteName) {
  if (!category || !siteName) return new Set();

  // --- MODIFIED PATH ---
  const collectionRef = db.collection(RSS_SERVICE_CONSTANTS.COLLECTION_ARTICLES)
    .doc(category)
    .collection('sources') // New intermediate collection
    .doc(siteName)
    .collection('posts');  // Uniform sub-collection name

  try {
    // Order by fetchedAt (server timestamp when written) to get the latest
    const snapshot = await collectionRef
      .orderBy("fetchedAt", "desc")
      .limit(RSS_SERVICE_CONSTANTS.RECENT_ARTICLES_LIMIT)
      .get();

    const ids = new Set();
    snapshot.forEach(doc => ids.add(doc.id));
    return ids;
  } catch (e) {
    // If the collection doesn't exist yet, this is fine.
    return new Set();
  }
}

// Function to send FCM notifications for new articles (using Promise.allSettled)
async function sendNotificationsForNewArticles(newArticles, summary) {
  for (const article of newArticles) {
    try {
      // تجهيز رابط الصورة
      const imageLink = article.thumbnail || "";

      const message = {
        topic: article.topicName,
        notification: {
          title: `${article.title.length > 100
            ? article.title.substring(0, 100) + "..."
            : article.title}`,
          body:
            article.description.length > 100
              ? article.description.substring(0, 300) + "..."
              : article.description,
          // ✅ التصحيح: استخدام imageUrl بدلاً من image
          ...(imageLink ? { imageUrl: imageLink } : {}),
        },
        data: {
          articleId: article.guid || article.link || "",
          siteName: article.siteName || "",
          // siteImage: article.siteImage || "", // صورة الموقع
          category: article.category || "",
          link: article.link || "",
          image: imageLink || "",
          thumbnail: imageLink || "",
          title: (article.title || "").substring(0, 200),
          description: (article.description || "").substring(0, 300),
          // التاريخ نحوله لنص ISO لأنه لا يمكن إرسال كائنات Date عبر FCM
          pubDate: article.pubDate ? article.pubDate.toDate().toISOString() : new Date().toISOString(),
        },
        android: {
          notification: {
            icon: "ic_notification",
            color: "#779bdd",
            sound: "default",
            priority: "high",
            channelId: "news_notifications",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            // ✅ التصحيح: استخدام imageUrl هنا أيضاً للأندرويد
            ...(imageLink ? { imageUrl: imageLink } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              "mutable-content": 1,
            },
          },
          fcm_options: {
            ...(imageLink ? { image: imageLink } : {}),
          }
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Notification sent for ${article.siteName}: ${response}`);
      summary.notificationsSent++;
    } catch (error) {
      console.error(
        `❌ Failed to send notification for ${article.siteName}:`,
        error
      );
      summary.errors.push({
        type: "notification_send",
        site: article.siteName,
        msg: String(error).slice(0, 1000),
      });
    }
  }
}

async function runFetchAll({ concurrency = RSS_SERVICE_CONSTANTS.DEFAULT_CONCURRENCY, batchSize = RSS_SERVICE_CONSTANTS.BATCH_WRITE_SIZE } = {}) {
  const summary = {
    sourcesProcessed: 0,
    articlesUpserted: 0,
    notificationsSent: 0,
    errors: [],
  };
  const sources = [];

  // --- Step 1: Read all RSS sources (Single Read Operation) ---
  try {
    const snap = await db.collection(RSS_SERVICE_CONSTANTS.COLLECTION_RSS).get();
    if (!snap.empty) {
      snap.forEach((doc) => {
        const data = doc.data();
        const extracted = extractSourcesFromDocData(data);
        for (const e of extracted) {
          const s = e.source || e;
          const category = e.category || null;
          const rssUrl = s.rssUrl || s.url || s.feed || s.link || null;
          if (!rssUrl) continue;
          sources.push({
            docId: doc.id,
            id: s.id ? String(s.id) : sha1(rssUrl + (s.name || "")),
            name: s.name || s.title || null,
            rssUrl,
            language: s.language || null,
            image: s.image || null,
            raw: s,
            category,
          });
        }
      });
    }
  } catch (err) {
    console.error("Error reading rss collection:", err);
    process.exit(2);
  }

  summary.sourcesProcessed = sources.length;
  if (!sources.length) {
    console.log("No sources found. Exiting.");
    return summary;
  }

  // --- Step 2: Process sources concurrently (Workers) ---
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= sources.length) break;
      const site = sources[i];

      // Sanitized names for Firestore paths
      const rawCategory = site.category || null;
      const categorySanitized = safeId(rawCategory) || "uncategorized";
      const siteNameCandidate = site.name || (site.raw && (site.raw.name || site.raw.title)) || site.id;
      const siteNameSanitized = safeId(siteNameCandidate) || site.id || sha1(site.rssUrl);

      try {
        console.log(`[${i + 1}/${sources.length}] Fetching ${site.rssUrl}`);
        const parsed = await fetchRss(site.rssUrl);
        const items = normalizeItems(parsed);
        if (!items.length) continue;

        // 💡 Optimization: Fetch recent article IDs (Single Read per Site)
        const recentIds = await getRecentArticleIds(categorySanitized, siteNameSanitized);
        console.log(`Found ${items.length} RSS items. Checking against ${recentIds.size} recent IDs.`);

        const newArticles = [];
        let articlesWritten = 0;

        for (let sindex = 0; sindex < items.length; sindex += batchSize) {
          const chunk = items.slice(sindex, sindex + batchSize);
          const batch = db.batch();

          for (const it of chunk) {
            // 💡 Optimized Check: Skip if the article ID is already in the recent set (in-memory)
            if (recentIds.has(it.docId)) {
              continue; // Skip the Firestore write operation
            }

            // --- MODIFIED PATH ---
            const docRef = db
              .collection(RSS_SERVICE_CONSTANTS.COLLECTION_ARTICLES)
              .doc(categorySanitized)
              .collection('sources') // New intermediate
              .doc(siteNameSanitized)
              .collection('posts')   // Uniform sub-collection
              .doc(it.docId);

            // prepare doc payload
            const payload = {
              title: it.title || "",
              link: it.link || null,
              description: it.description || "",
              pubDate: it.pubDate
                ? admin.firestore.Timestamp.fromDate(it.pubDate)
                : null,
              guid: it.guid || null,
              fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
              siteName: site.name || null,
              siteImage: site.image || null,
              language: site.language || null,
              category: rawCategory || null,
              thumbnail: it.thumbnail || null,
            };

            // 3. Write only the new article
            batch.set(docRef, payload, { merge: true });
            articlesWritten++;

            // Add to notification list
            newArticles.push({
              ...payload,
              topicName: `${rawCategory || "uncategorized"}_${siteNameSanitized}`,
              siteName: site.name || siteNameSanitized,
            });
          }

          // 4. Commit batch writes (Single Write Operation per Batch)
          if (articlesWritten > 0) {
            await batch.commit();
            summary.articlesUpserted += articlesWritten;
            console.log(`[${site.name || site.id}] Wrote ${articlesWritten} new articles.`);
            articlesWritten = 0; // Reset for next batch
          }
        }

        // 5. Send notifications for all new articles (Optimized for parallelism)
        if (newArticles.length > 0) {
          await sendNotificationsForNewArticles(newArticles, summary);
        }

        // 6. Update last fetched timestamp (Single Write Operation per Site)
        if (site.docId) {
          try {
            await db.collection(RSS_SERVICE_CONSTANTS.COLLECTION_RSS).doc(site.docId).update({
              lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            console.warn(`Could not update lastFetchedAt for ${site.name}: ${e.message}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error for ${site.rssUrl}:`, err.message || err);
        summary.errors.push({
          site: site.rssUrl,
          msg: String(err).slice(0, 1000),
        });
      }
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, sources.length) },
    () => worker()
  );
  await Promise.all(runners);

  console.log("--- FINAL SUMMARY ---");
  console.log(`Sources Processed: ${summary.sourcesProcessed}`);
  console.log(`Articles Upserted: ${summary.articlesUpserted}`);
  console.log(`Notifications Sent: ${summary.notificationsSent}`);
  if (summary.errors.length > 0) {
    console.log(`Errors: ${summary.errors.length}`);
  }
  return summary;
}

// run immediately
runFetchAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });