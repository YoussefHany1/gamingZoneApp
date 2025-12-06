import { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";

const APPWRITE_DATABASE_ID =
  Constants?.expoConfig?.extra?.APPWRITE_DATABASE_ID ??
  process.env.APPWRITE_DATABASE_ID;
const ARTICLES_COLLECTION_ID =
  Constants?.expoConfig?.extra?.ARTICLES_COLLECTION_ID ??
  process.env.ARTICLES_COLLECTION_ID;

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

  const cacheKey = useMemo(
    () => `feed_cache_${category || "nocat"}_${siteName || "all"}`,
    [category, siteName]
  );

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshTrigger(Date.now());
  }, [setError, setLoading, setRefreshTrigger]);

  useEffect(() => {
    // إذا لم يوجد تصنيف نرجع فارغ
    if (!category) {
      setArticles([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    let unsubscribeFn = null;

    const loadFromCache = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData && mounted) {
          setArticles(JSON.parse(cachedData));
        }
      } catch (err) {
        console.error("Cache loading error:", err);
      }
      // finally {
      //   // لا نغطي حالة الشبكة هنا — لكن نزيل الـ loading لو لم يتغيّر لاحقاً
      //   if (mounted) setLoading(false);
      // }
    };

    const queries = [
      Query.orderDesc("pubDate"),
      Query.equal("category", category),
      Query.limit(2000), // حد مبدئي للحماية
    ];
    if (siteName) queries.push(Query.equal("siteName", siteName));

    const fetchArticles = async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          ARTICLES_COLLECTION_ID,
          queries
        );
        if (!mounted) return;
        const data = response.documents || [];

        setArticles(data);
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
          console.error("Failed to save to cache:", e);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Appwrite error:", err);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // تنفيذ التحميل من الكاش سريعاً ثم جلب من الشبكة
    loadFromCache();
    fetchArticles();

    // الاشتراك بالـ realtime
    try {
      const subscription = client.subscribe(
        `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`,
        (response) => {
          if (!mounted) return;

          const isCreateEvent =
            Array.isArray(response.events) &&
            response.events.some(
              (e) => e.endsWith(".create") || e.includes(".create")
            );

          if (!isCreateEvent) return;

          const newDoc = response.payload;
          if (!newDoc) return;

          const isMatchCategory = newDoc.category === category;
          const isMatchSite = siteName ? newDoc.siteName === siteName : true;
          if (!isMatchCategory || !isMatchSite) return;

          setArticles((prev) => {
            // تفادي التكرار بواسطة $id
            const exists = prev.some((p) => p.$id === newDoc.$id);
            const updated = exists
              ? prev.map((p) => (p.$id === newDoc.$id ? newDoc : p))
              : [newDoc, ...prev];
            const sliced = updated.slice(0, 200); // حافظ على حد معقول
            AsyncStorage.setItem(cacheKey, JSON.stringify(sliced)).catch((e) =>
              console.error("Failed to update cache (realtime):", e)
            );
            return sliced;
          });
        }
      );

      // بعض إصدارات SDK ترجع دالة unsub، وبعضها يرجع كائن مع .unsubscribe()
      if (typeof subscription === "function") {
        unsubscribeFn = subscription;
      } else if (
        subscription &&
        typeof subscription.unsubscribe === "function"
      ) {
        unsubscribeFn = () => subscription.unsubscribe();
      }
    } catch (err) {
      console.error("Realtime subscribe error:", err);
    }

    return () => {
      mounted = false;
      try {
        if (typeof unsubscribeFn === "function") unsubscribeFn();
      } catch (e) {
        console.warn("Error during unsubscribe:", e);
      }
    };
  }, [category, siteName, refreshTrigger, cacheKey]);

  return { articles, loading, error, isFetching: loading, refetch };
}
