// Node script to run on GitHub Actions (or any cron runner).
// Expects env:
// - SERVICE_ACCOUNT : the JSON content of a GCP service account key (string)  [optional]
// - FIREBASE_PROJECT_ID : your Firebase project id
// - RSS_SECRET (optional) : secret used for any auth logic (not required here)

const admin = require("firebase-admin");
const axios = require("axios");
const xml2js = require("xml2js");
const crypto = require("crypto");
const striptags = require("striptags");
const he = require("he");
// If you prefer to pass the service account JSON via env var SERVICE_ACCOUNT,
// try to parse it, otherwise fallback to local file (as original).
let serviceAccount = null;
if (process.env.SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
  } catch (e) {
    console.warn(
      "Failed to parse SERVICE_ACCOUNT env var; falling back to serviceAccountKey.json if present."
    );
  }
}
if (!serviceAccount) {
  try {
    // adjust path if needed
    serviceAccount = require("../serviceAccountKey.json");
  } catch (e) {
    // if not found, we will still init using application default credentials if available
    console.warn(
      "serviceAccountKey.json not found; relying on ADC if available."
    );
  }
}

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

function sha1(input) {
  return crypto
    .createHash("sha1")
    .update(String(input || ""))
    .digest("hex");
}

async function fetchRss(url) {
  const res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "RSS-Fetcher/1.0 (+mailto:youssefhany.2005.yh@gmail.com)",
    },
  });
  return parser.parseStringPromise(res.data);
}

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
      const title =
        (i.title &&
          (typeof i.title === "object" ? i.title._ || i.title : i.title)) ||
        "";
      const description =
        striptags(String(i.description)).replace(/\s+/g, " ").trim() ||
        i.content ||
        "";
      const pubDate = i.pubDate || i.pubdate || i["dc:date"] || null;
      const descriptionImage = String(i.description).match(
        /<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i
      )?.[1];
      const thumbnail =
        i.thumbnail ||
        // i.thumbnail?.[0] ||
        i.image ||
        i.enclosure?.[0]?.["url"]?.[0] ||
        i.enclosure?.[0]?.link ||
        i["media:thumbnail"]?.[0] ||
        i["media:content"]?.[0]?.["url"]?.[0] ||
        descriptionImage ||
        null;

      items.push({
        title,
        link,
        description,
        pubDate: pubDate ? new Date(pubDate) : null,
        thumbnail,
        raw: i,
      });
    }
  }
  // else if (parsed.feed && parsed.feed.entry) {
  //   let it = parsed.feed.entry;
  //   it = Array.isArray(it) ? it : [it];
  //   for (const i of it) {
  //     let link = null;
  //     if (i.link) {
  //       if (Array.isArray(i.link)) {
  //         const alt = i.link.find((l) => l.rel === "alternate") || i.link[0];
  //         link =
  //           (alt &&
  //             (alt.href || alt._ || (typeof alt === "string" ? alt : null))) ||
  //           null;
  //       } else {
  //         link =
  //           i.link.href ||
  //           i.link._ ||
  //           (typeof i.link === "string" ? i.link : null);
  //       }
  //     }
  //     const title = i.title || "N/A";
  //     const description =
  //       he
  //         .decode(he.decode(striptags(String(i.description))))
  //         .replace(/\s+/g, " ")
  //         .trim() ||
  //       i.content ||
  //       "";
  //     const pubDate = i.pubDate || i.pubdate || i["dc:date"] || null;
  //     const descriptionImage = String(i.description).match(
  //       /<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i
  //     )?.[1];
  //     const thumbnail =
  //       i.thumbnail ||
  //       // i.thumbnail?.[0] ||
  //       i.image ||
  //       i.enclosure?.[0]?.["url"]?.[0] ||
  //       i.enclosure?.[0]?.link ||
  //       i["media:thumbnail"]?.[0] ||
  //       i["media:content"]?.[0]?.["url"]?.[0] ||
  //       descriptionImage ||
  //       null;

  //     items.push({
  //       title,
  //       link,
  //       description,
  //       pubDate: pubDate ? new Date(pubDate) : null,
  //       thumbnail,
  //       raw: i,
  //     });
  //   }
  // }
  return items.filter((it) => it.link || it.guid);
}

// --- helper: group/normalize sources from rss collection docs
function extractSourcesFromDocData(data) {
  const result = [];
  if (Array.isArray(data)) {
    for (const entry of data) {
      result.push({ source: entry, category: null });
    }
    return result;
  }
  if (data && typeof data === "object") {
    if (Array.isArray(data.sources))
      return data.sources.map((s) => ({ source: s, category: "sources" }));
    if (Array.isArray(data.sites))
      return data.sites.map((s) => ({ source: s, category: "sites" }));
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

// Initialize Firebase admin
if (serviceAccount && serviceAccount.client_email) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} else {
  // fallback to default credentials (e.g., when running on GCP environment or CI with ADC)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = admin.firestore();

async function runFetchAll({ concurrency = 4, batchSize = 400 } = {}) {
  const summary = { sourcesProcessed: 0, articlesUpserted: 0, errors: [] };
  const sources = [];

  try {
    const snap = await db.collection("rss").get();
    if (!snap.empty) {
      snap.forEach((doc) => {
        const data = doc.data();
        const extracted = extractSourcesFromDocData(data);
        for (const e of extracted) {
          const s = e.source || e; // backward compat if structure differs
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

  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= sources.length) break;
      const site = sources[i];
      try {
        const parsed = await fetchRss(site.rssUrl);
        const items = normalizeItems(parsed);
        if (!items.length) continue;

        // compute sanitized category and siteName to use in path
        const rawCategory = site.category || null;
        const categorySanitized = safeId(rawCategory) || "uncategorized";

        // siteName: prefer explicit name, fallback to id
        const siteNameCandidate =
          site.name ||
          (site.raw && (site.raw.name || site.raw.title)) ||
          site.id;
        const siteNameSanitized =
          safeId(siteNameCandidate) || site.id || sha1(site.rssUrl);

        for (let sindex = 0; sindex < items.length; sindex += batchSize) {
          const chunk = items.slice(sindex, sindex + batchSize);
          const batch = db.batch();
          for (const it of chunk) {
            const docId = sha1(it.guid || it.link || it.title);
            const docRef = db
              .collection("articles")
              .doc(categorySanitized)
              .collection(siteNameSanitized)
              .doc(docId);

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
              category: rawCategory || null, // store original category if present
              thumbnail: it.thumbnail || null, // <-- new field
            };

            batch.set(docRef, payload, { merge: true });
          }
          await batch.commit();
          summary.articlesUpserted += chunk.length;
        }

        if (site.docId) {
          try {
            await db.collection("rss").doc(site.docId).update({
              lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            // ignore update errors
          }
        }
      } catch (err) {
        console.error(`Error for ${site.rssUrl}:`, err.message || err);
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

  console.log("Summary:", summary);
  return summary;
}

// run immediately
runFetchAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
