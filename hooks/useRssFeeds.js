import { useState, useEffect } from "react";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "RSS_FEEDS_CACHE";

const useRssFeeds = () => {
  const [rssFeeds, setRssFeeds] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. تحميل الكاش فوراً عند الفتح لتحسين الأداء
    const loadFromCache = async () => {
      try {
        const cachedString = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedString && isMounted) {
          console.log("📦 Showing Cached Data immediately");
          setRssFeeds(JSON.parse(cachedString));
          setLoading(false);
        }
      } catch (error) {
        console.error("Cache loading error:", error);
      }
    };

    loadFromCache();

    // 2. الاستماع للتغييرات في Firestore (Real-time)
    const subscriber = firestore()
      .collection("rss")
      .onSnapshot(
        (snapshot) => {
          let feeds = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            feeds = { ...feeds, ...data };
          });

          if (isMounted) {
            console.log("🔥 Firestore update received - Syncing...");
            setRssFeeds(feeds);
            setLoading(false);
            // تحديث الكاش بالبيانات الجديدة
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feeds));
          }
        },
        (error) => {
          console.error("🚨 Error fetching Firestore:", error);
          if (isMounted) setLoading(false);
        }
      );

    return () => {
      isMounted = false;
      subscriber();
    };
  }, []);
  return { rssFeeds, loading };
};

export default useRssFeeds;
