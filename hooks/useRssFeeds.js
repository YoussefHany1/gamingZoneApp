import { useQuery } from "@tanstack/react-query";
import { databases } from "../lib/appwrite"; // استيراد databases من إعدادات Appwrite لديك
import Constants from "expo-constants";
import { Query } from "react-native-appwrite";

// جلب الثوابت من إعدادات Expo
const { APPWRITE_DATABASE_ID, RSS_COLLECTION_ID } = Constants.expoConfig.extra;

const fetchRssFeeds = async () => {
  console.log("📡 Fetching RSS feeds from Appwrite...");

  // 1. جلب كل المستندات من Appwrite (تأكد من زيادة الـ limit إذا كان لديك مصادر كثيرة)
  const response = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    RSS_COLLECTION_ID,
    [Query.limit(100)]
  );

  const documents = response.documents;
  const feeds = {};

  // 2. تحويل القائمة المسطحة (Flat List) من Appwrite إلى هيكل كائن (Object) مفهرس حسب التصنيف
  // ليتناسب مع NewsScreen.js الذي يتوقع: rssFeeds['news'], rssFeeds['reviews'], ...
  documents.forEach((doc) => {
    const category = doc.category; // تأكد أن حقل التصنيف اسمه 'category' في Appwrite

    if (!feeds[category]) {
      feeds[category] = [];
    }

    // إضافة المصدر للقائمة الخاصة بتصنيفه
    feeds[category].push({
      ...doc,
      // تنظيف البيانات إذا لزم الأمر، أو تمرير المستند كما هو
      name: doc.name,
      language: doc.language || "en", // قيمة افتراضية إذا لم تحدد اللغة
      image: doc.image,
      website: doc.rssUrl || doc.website, // حسب تسمية الحقول عندك
    });
  });

  return feeds;
};

const useRssFeeds = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rssFeeds"],
    queryFn: fetchRssFeeds,
    staleTime: 1000 * 60 * 5, // 5 دقائق كاش
    gcTime: 1000 * 60 * 60,
    retry: 2,
  });

  return {
    rssFeeds: data || {},
    loading: isLoading,
    error,
  };
};

export default useRssFeeds;
