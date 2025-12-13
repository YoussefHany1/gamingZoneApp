import { useQuery } from "@tanstack/react-query";
import firestore from "@react-native-firebase/firestore";

// دالة جلب البيانات (Promise-based بدلاً من Listener)
const fetchRssFeeds = async () => {
  console.log("📡 Fetching RSS feeds from Firestore...");
  const snapshot = await firestore().collection("rss").get();

  let feeds = {};
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    feeds = { ...feeds, ...data };
  });

  return feeds;
};

const useRssFeeds = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rssFeeds"], // مفتاح فريد للكاش
    queryFn: fetchRssFeeds,
    staleTime: 1000 * 60 * 10, // (10 دقائق) لا يتم جلب البيانات مجدداً خلال هذه المدة إلا إذا أجبرته
    gcTime: 1000 * 60 * 60, // (ساعة واحدة) مدة الاحتفاظ بالبيانات في الذاكرة
    retry: 2, // إعادة المحاولة مرتين عند الفشل
  });

  return {
    rssFeeds: data || {},
    loading: isLoading,
    error,
  };
};

export default useRssFeeds;
