import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { databases, client } from "../lib/appwrite";
import Constants from "expo-constants";
const { APPWRITE_DATABASE_ID, ARTICLES_COLLECTION_ID } =
  Constants.expoConfig.extra;

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

  const cacheKey = `feed_cache_${category || "nocat"}_${siteName || "all"}`;

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshTrigger(Date.now());
  }, []);

  useEffect(() => {
    if (!category) {
      setArticles([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadFromCache = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData && isMounted) {
          setArticles(JSON.parse(cachedData));
          setLoading(false);
        }
      } catch (err) {
        console.error("Cache loading error:", err);
      }
    };

    loadFromCache();

    // 2️⃣ تجهيز الاستعلام (Queries)
    // في Appwrite نستخدم مصفوفة من الـ Queries
    const queries = [
      Query.orderDesc("pubDate"), // ترتيب تنازلي حسب التاريخ
      Query.limit(30), // جلب 30 مقال فقط
      Query.equal("category", category), // فلتر التصنيف أساسي
    ];

    // لو تم تحديد موقع معين، نضيف فلتر الموقع
    if (siteName) {
      queries.push(Query.equal("siteName", siteName));
    }

    // دالة جلب البيانات
    const fetchArticles = async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          ARTICLES_COLLECTION_ID,
          queries
        );

        if (!isMounted) return;

        // Appwrite ترجع البيانات داخل documents
        const data = response.documents;

        setArticles(data);
        setLoading(false);

        // تحديث الكاش
        AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch((err) =>
          console.error("Failed to save to cache:", err)
        );
      } catch (err) {
        if (!isMounted) return;
        console.error("Appwrite error:", err);
        setError(err);
        setLoading(false);
      }
    };

    // استدعاء الجلب المبدئي
    fetchArticles();
    // 3️⃣ الاستماع للتحديثات (Real-time)
    // Appwrite Realtime يختلف عن Snapshot، هو يرسل "الأحداث" وليس "البيانات كاملة"
    const unsubscribe = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${ARTICLES_COLLECTION_ID}.documents`,
      (response) => {
        if (!isMounted) return;

        // التحقق مما إذا كان الحدث (إنشاء مقال جديد)
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          const newArticle = response.payload;

          // التحقق يدوياً أن المقال الجديد يتبع التصنيف والموقع المحددين
          const isMatchCategory = newArticle.category === category;
          const isMatchSite = siteName
            ? newArticle.siteName === siteName
            : true;

          if (isMatchCategory && isMatchSite) {
            setArticles((prevArticles) => {
              // إضافة المقال الجديد في الأول
              const updated = [newArticle, ...prevArticles];
              // حفظ الكاش المحدث
              AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
              return updated;
            });
          }
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe(); // إيقاف الاستماع
    };
  }, [category, siteName, refreshTrigger, cacheKey]);

  const isFetching = loading;

  return { articles, loading, error, isFetching, refetch };
}
