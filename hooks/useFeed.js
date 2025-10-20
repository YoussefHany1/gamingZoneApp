// // hooks/useFeed.js
// import { useEffect, useState, useCallback } from "react";
// import {
//   getFirestore,
//   collection,
//   query,
//   orderBy,
//   limit,
//   getDocs,
// } from "firebase/firestore";

// // ===== helpers =====
// function safeId(input) {
//   if (!input) return null;
//   return String(input)
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "_")
//     .replace(/[^a-z0-9_\-]/g, "_")
//     .replace(/_+/g, "_")
//     .replace(/^\_+|\_+$/g, "");
// }

// function extractSourcesFromDocData(data) {
//   const result = [];
//   if (!data) return result;
//   if (Array.isArray(data)) {
//     for (const entry of data) result.push({ source: entry, category: null });
//     return result;
//   }
//   if (typeof data === "object") {
//     if (Array.isArray(data.sources))
//       return data.sources.map((s) => ({ source: s, category: "sources" }));
//     if (Array.isArray(data.sites))
//       return data.sites.map((s) => ({ source: s, category: "sites" }));
//     for (const key of Object.keys(data)) {
//       const val = data[key];
//       if (Array.isArray(val)) {
//         for (const s of val) result.push({ source: s, category: key });
//       } else if (
//         val &&
//         typeof val === "object" &&
//         (val.name || val.url || val.rssUrl)
//       ) {
//         result.push({ source: val, category: key });
//       }
//     }
//     if (result.length === 0 && (data.name || data.url || data.rssUrl))
//       result.push({ source: data, category: null });
//     return result;
//   }
//   return result;
// }

// // ===== concurrency helper (simple worker queue) =====
// async function mapWithConcurrency(arr, workerFn, concurrency = 4) {
//   const results = new Array(arr.length);
//   let idx = 0;
//   async function runner() {
//     while (true) {
//       const i = idx++;
//       if (i >= arr.length) return;
//       try {
//         results[i] = await workerFn(arr[i], i);
//       } catch (e) {
//         results[i] = { __error: e };
//       }
//     }
//   }
//   const runners = Array.from(
//     { length: Math.min(concurrency, arr.length) },
//     () => runner()
//   );
//   await Promise.all(runners);
//   return results;
// }

// // ===== useFeed =====
// export default function useFeed(category, siteName, opts = {}) {
//   const pageSize = opts.pageSize || 200;
//   const concurrency = opts.concurrency || 4;
//   const db =
//     opts.firebaseDb ||
//     (() => {
//       try {
//         return getFirestore();
//       } catch (e) {
//         return null;
//       }
//     })();

//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState(null);
//   const [progress, setProgress] = useState({ done: 0, total: 0 });

//   async function gatherSitesForCategory(categoryRaw) {
//     if (!db)
//       throw new Error(
//         "Firestore not initialized. مرّر firebaseDb في opts أو أهيئ Firebase قبل الاستخدام."
//       );
//     const snap = await getDocs(collection(db, "rss"));
//     const catSan = safeId(categoryRaw) || null;
//     const sites = [];
//     snap.forEach((d) => {
//       const data = d.data();
//       const extracted = extractSourcesFromDocData(data);
//       for (const e of extracted) {
//         const s = e.source || e;
//         const rawCategory = e.category || null;
//         const rawCategorySan = safeId(rawCategory) || null;
//         if (categoryRaw && rawCategorySan !== catSan) continue;
//         const rssUrl = s.rssUrl || s.url || s.feed || s.link || null;
//         if (!rssUrl) continue;
//         const siteNameCandidate = s.name || s.title || s.id || rssUrl;
//         const siteNameSan = safeId(siteNameCandidate) || null;
//         sites.push({
//           name: s.name || s.title || null,
//           siteNameSan,
//           rssUrl,
//           raw: s,
//           categoryRaw,
//         });
//       }
//     });
//     return sites;
//   }

//   async function fetchSiteArticles(categoryRaw, siteNameSan) {
//     if (!db) throw new Error("Firestore not initialized.");
//     const categorySan = safeId(categoryRaw) || "uncategorized";
//     const colRef = collection(db, "articles", categorySan, siteNameSan);
//     const q = query(colRef, orderBy("pubDate", "desc"), limit(pageSize));
//     const snap = await getDocs(q);
//     const out = [];
//     snap.forEach((d) => {
//       const data = d.data();
//       const pub =
//         data.pubDate && data.pubDate.toDate
//           ? data.pubDate.toDate()
//           : data.pubDate || null;
//       out.push({ id: d.id, ...data, pubDate: pub });
//     });
//     return out;
//   }

//   const doFetch = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     setProgress({ done: 0, total: 0 });
//     try {
//       if (!db) throw new Error("Firestore not initialized.");
//       let sites = [];

//       if (siteName) {
//         sites = [{ siteNameSan: safeId(siteName) }];
//       } else {
//         sites = await gatherSitesForCategory(category);
//       }

//       if (!sites || sites.length === 0) {
//         setItems([]);
//         setLoading(false);
//         return;
//       }

//       setProgress({ done: 0, total: sites.length });

//       // worker function for each site (index used to update progress)
//       const worker = async (s, i) => {
//         if (!s.siteNameSan) {
//           setProgress((p) => ({ ...p, done: p.done + 1 }));
//           return [];
//         }
//         try {
//           const res = await fetchSiteArticles(category, s.siteNameSan);
//           setProgress((p) => ({ ...p, done: p.done + 1 }));
//           return res;
//         } catch (e) {
//           console.warn("site fetch failed", s.siteNameSan, e);
//           setProgress((p) => ({ ...p, done: p.done + 1 }));
//           return [];
//         }
//       };

//       const results = await mapWithConcurrency(sites, worker, concurrency);
//       // results is array of arrays (or objects with __error)
//       const merged = results.flatMap((r) => (Array.isArray(r) ? r : []));
//       merged.sort((a, b) => {
//         const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
//         const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
//         return tb - ta;
//       });

//       setItems(merged);
//     } catch (err) {
//       console.error("useFeed fetch error", err);
//       setError(err);
//       setItems([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [category, siteName, db, pageSize, concurrency]);

//   useEffect(() => {
//     doFetch();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [category, siteName]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await doFetch();
//   }, [doFetch]);

//   return { items, loading, error, refreshing, onRefresh, progress };
// }

// testRealtime.js

// useArticlesRealtime.js (React hook)
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const colRef = collection(db, "articles", category, siteName);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setArticles(data);
        setLoading(false);
      },
      (err) => {
        console.error("Realtime error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [category, siteName]);

  return { articles, loading, error };
}
