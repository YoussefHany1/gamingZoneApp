import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { databases } from "../lib/appwrite";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";

const { APPWRITE_DATABASE_ID } = Constants.expoConfig.extra;
const RSS_COLLECTION_ID = "news_sources";
const CACHE_KEY = "RSS_FEEDS_CACHE";

const useRssFeeds = () => {
  const [rssFeeds, setRssFeeds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchFeeds = async () => {
      // 1. تحميل الكاش وعرضه فوراً (السرعة القصوى)
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && mounted) {
          const parsed = JSON.parse(cached);
          // إذا وجدنا بيانات، نعرضها ونوقف التحميل فوراً
          if (Object.keys(parsed).length > 0) {
            setRssFeeds(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        console.error("Cache load error:", e);
      }

      // 2. التحقق من الإنترنت
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        if (mounted) setLoading(false);
        return; // توقف إذا لا يوجد نت
      }

      // 3. جلب البيانات الحديثة من السيرفر (في الخلفية)
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          RSS_COLLECTION_ID,
          [Query.limit(100)]
        );

        if (!mounted) return;

        const documents = response.documents;
        const feeds = {};

        // تحويل البيانات
        documents.forEach((doc) => {
          const category = doc.category;
          if (!feeds[category]) {
            feeds[category] = [];
          }
          feeds[category].push({
            ...doc,
            name: doc.name,
            language: doc.language || "en",
            image: doc.image,
            website: doc.rssUrl || doc.website,
          });
        });

        // تحديث الحالة وتحديث الكاش للمرة القادمة
        setRssFeeds(feeds);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feeds)).catch((e) =>
          console.error("Failed to save cache:", e)
        );
      } catch (err) {
        console.error("Appwrite RSS error:", err);
        // نعرض الخطأ فقط إذا لم يكن لدينا بيانات قديمة معروضة
        if (mounted && Object.keys(rssFeeds).length === 0) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFeeds();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    rssFeeds,
    loading,
    error,
  };
};

export default useRssFeeds;
