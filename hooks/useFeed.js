import { useEffect, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  orderBy,
  where,
  onSnapshot,
} from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
// أو من firebase/firestore لو انت مستخدم SDK بتاع الويب مع Expo

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

  // إنشاء مفتاح فريد للكاش بناءً على التصنيف واسم الموقع
  const cacheKey = `feed_cache_${category || "nocat"}_${siteName || "all"}`;

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshTrigger(Date.now());
  }, []);

  useEffect(() => {
    // لو مفيش كاتيجوري أصلاً، ما نعملش subscribe
    if (!category) {
      setArticles([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1️⃣ محاولة تحميل البيانات من الكاش أولاً لعرضها فوراً
    const loadFromCache = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData && isMounted) {
          // لو في داتا في الكاش نعرضها ونوقف اللودينج مؤقتاً لحد ما الـ Realtime يشتغل
          setArticles(JSON.parse(cachedData));
          setLoading(false);
        }
      } catch (err) {
        console.error("Cache loading error:", err);
      }
    };

    // تشغيل تحميل الكاش
    loadFromCache();

    const db = getFirestore();
    let q;

    // ✅ الحالة 1: فيه category و siteName → نفس الكود القديم
    if (category && siteName) {
      const postsCollectionRef = collection(
        db,
        "articles",
        category,
        "sources",
        siteName,
        "posts"
      );

      q = query(postsCollectionRef, orderBy("pubDate", "desc"));
    }

    // ✅ الحالة 2: فيه category بس ومفيش siteName → كل المواقع في الكاتيجوري ده
    if (category && !siteName) {
      // لازم يكون جوه كل post حقل category بنفس القيمة
      const postsCollectionGroup = collectionGroup(db, "posts");

      q = query(
        postsCollectionGroup,
        where("category", "==", category),
        orderBy("pubDate", "desc")
      );
    }

    if (!q) {
      setLoading(false);
      return;
    }

    // 2️⃣ الاستماع للتحديثات (Real-time)
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;

        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // تحديث البيانات في الواجهة
        setArticles(data);
        setLoading(false);

        // حفظ البيانات الجديدة في الكاش (هيمسح القديم ويحط الجديد لنفس المفتاح)
        AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch((err) =>
          console.error("Failed to save to cache:", err)
        );
      },
      (err) => {
        if (!isMounted) return;
        console.error("Realtime error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [category, siteName, refreshTrigger, cacheKey]);

  const isFetching = loading; // لو محتاج تستخدمه في الـ UI زي ما كنت عامل في LatestNews

  return { articles, loading, error, isFetching, refetch };
}
