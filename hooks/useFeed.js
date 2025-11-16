import { useEffect, useState } from "react";
import firestore from '@react-native-firebase/firestore';

export default function useFeed(category, siteName) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅
    const colRef = firestore()
      .collection("articles")
      .doc(category)
      .collection(siteName);

    const unsub = colRef.onSnapshot( // ✅
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
