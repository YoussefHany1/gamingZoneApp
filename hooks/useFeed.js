import { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;
const ARTICLES_COLLECTION_ID = "articles";

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
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
    setArticles([]);
    setLoading(true);
    if (!category) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let unsubscribeFn = null;

    const loadData = async () => {
      // 1. تحميل الكاش وعرضه فوراً (الأولوية القصوى)
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData && mounted) {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed.length > 0) {
            setArticles(parsed);
            setLoading(false); // إخفاء الـ Skeleton فوراً لأننا وجدنا بيانات
          }
        }
      } catch (err) {
        console.error("Cache loading error:", err);
      }

      // 2. التحقق من الشبكة وجلب البيانات الحديثة (في الخلفية)
      try {
        if (mounted) setIsFetching(true); // إظهار علامة التحديث الصغيرة إن وجدت

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          if (mounted) {
            setLoading(false); // تأكد من إخفاء التحميل حتى لو لم نجد كاش
            setIsFetching(false);
          }
          return;
        }

        const queries = [
          Query.orderDesc("pubDate"),
          Query.equal("category", category),
          Query.limit(200),
        ];
        if (siteName) queries.push(Query.equal("siteName", siteName));

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          ARTICLES_COLLECTION_ID,
          queries
        );

        if (!mounted) return;
        const data = response.documents || [];
        setArticles(data);
        if (data.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(
            console.error
          );
        }
      } catch (err) {
        console.error("Appwrite fetch error:", err);
        if (mounted && articles.length === 0) setError(err); // نظهر الخطأ فقط لو القائمة فارغة
      } finally {
        if (mounted) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    };

    loadData();

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

  return { articles, loading, error, isFetching, refetch };
}
