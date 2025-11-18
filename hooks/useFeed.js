import { useEffect, useState, useCallback } from "react";
import firestore from '@react-native-firebase/firestore';

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());

  // 2. دالة Refetch تسمح بتشغيل useEffect يدوياً
  const refetch = useCallback(() => {
    setError(null); // لإزالة أي أخطاء سابقة
    setLoading(true); // لإظهار مؤشر التحميل
    setRefreshTrigger(Date.now()); // تغيير هذه القيمة تعيد تشغيل الـ useEffect
  }, []);

  useEffect(() => {
    const colRef = firestore()
      .collection("articles")
      .doc(category)
      .collection(siteName);

    const unsub = colRef.onSnapshot(
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
  }, [category, siteName, refreshTrigger]);

  return { articles, loading, error, refetch };
}
