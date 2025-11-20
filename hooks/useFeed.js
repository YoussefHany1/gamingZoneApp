import { useEffect, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  orderBy,
  where,
  onSnapshot
} from '@react-native-firebase/firestore';
// أو من firebase/firestore لو انت مستخدم SDK بتاع الويب مع Expo

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

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

    const unsubscribe = onSnapshot(
      q,
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

    return () => unsubscribe();
  }, [category, siteName, refreshTrigger]);

  const isFetching = loading; // لو محتاج تستخدمه في الـ UI زي ما كنت عامل في LatestNews

  return { articles, loading, error, isFetching, refetch };
}
