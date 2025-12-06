import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  LayoutAnimation,
  ScrollView,
  Linking,
  InteractionManager,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { XMLParser } from "fast-xml-parser";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { databases } from "../lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import Constants from "expo-constants";
const { APPWRITE_DATABASE_ID, RSS_COLLECTION_ID } = Constants.expoConfig.extra;

import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import Loading from "../Loading";

// --- دالة مساعدة لإنشاء معرفات آمنة ---
const safeId = (input) => {
  if (!input) return "unknown";
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// --- 1. مكون فرعي يعرض قسم أخبار واحد ---
const NewsSection = ({
  gameName,
  title,
  sourceId,
  langParams,
  defaultExpanded = true,
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { preferences, toggleSource, loadingPreferences } =
    useNotificationPreferences();

  const categorySafe = safeId(gameName);
  const nameSafe = safeId(sourceId || title);
  const topicName = `${categorySafe}_${nameSafe}`;

  const isEnabled = !!preferences[topicName];

  const RSS_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(
    gameName
  )}${langParams}`;

  useEffect(() => {
    fetchRSS();
  }, [gameName]);

  const fetchRSS = async () => {
    try {
      const response = await axios.get(RSS_URL);
      const xmlText = response.data;
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlText);
      const channel = jsonObj?.rss?.channel;
      let items = [];

      if (channel?.item) {
        items = Array.isArray(channel.item) ? channel.item : [channel.item];
      }

      items.sort((a, b) => {
        return new Date(b.pubDate) - new Date(a.pubDate);
      });

      setNews(items);
    } catch (error) {
      console.error(`Error fetching RSS for ${title}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleToggleSwitch = async () => {
    // إذا كان الزر غير مفعل، وسنقوم بتفعيله الآن -> نحتاج لتسجيل المصدر في السيرفر
    if (!isEnabled) {
      try {
        // 1. البحث هل هذا المصدر مسجل من قبل؟
        const existingDocs = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          RSS_COLLECTION_ID,
          [Query.equal("category", categorySafe), Query.equal("name", nameSafe)]
        );

        const payload = {
          rssUrl: RSS_URL,
          category: categorySafe,
          name: nameSafe,
          isActive: true,
        };

        if (existingDocs.total > 0) {
          // ✅ المصدر موجود: نقوم بتحديثه فقط للتأكيد
          const docId = existingDocs.documents[0].$id;
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            RSS_COLLECTION_ID,
            docId,
            payload
          );
          console.log("✅ RSS Source updated in Appwrite");
        } else {
          // ✅ المصدر غير موجود: ننشئه بمعرف فريد جديد
          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            RSS_COLLECTION_ID,
            ID.unique(), // نستخدم ID تلقائي لتجنب مشكلة الطول المحدود (36 حرف)
            payload
          );
          console.log("✅ RSS Source created in Appwrite");
        }
      } catch (error) {
        console.error(
          "❌ Error adding/updating RSS source in Appwrite:",
          error
        );
        // يمكنك اتخاذ قرار هنا: هل تمنع التفعيل في الواجهة أم تسمح به محلياً؟
        // return;
      }
    }

    // تفعيل الاشتراك محلياً وفي الإشعارات
    toggleSource(categorySafe, nameSafe);
  };

  return (
    <View
      style={[
        styles.sectionContainer,
        langParams === "&hl=ar" ? { direction: "rtl" } : { direction: "ltr" },
      ]}
    >
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeaderLeft}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#779bdd"
            style={styles.chevronIcon}
          />
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>

        <Switch
          trackColor={{ false: "#3e3e3e", true: "#779bdd" }}
          thumbColor={"#ffffff"}
          onValueChange={handleToggleSwitch}
          value={isEnabled}
          disabled={loadingPreferences}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.listContainer}>
          {loading ? (
            <Loading />
          ) : news.length === 0 ? (
            <Text style={{ color: "gray", textAlign: "center" }}>
              No news found.
            </Text>
          ) : (
            <ScrollView
              style={{ maxHeight: 250, borderRadius: 8 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              {news.map((item, index) => (
                <TouchableOpacity
                  key={index.toString()}
                  style={styles.card}
                  onPress={() => item.link && Linking.openURL(item.link)}
                >
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.date}>{item.pubDate}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

// --- 2. الشاشة الرئيسية ---
function GameNewsScreen({ route, navigation }) {
  const Currentgame = route.params?.gameName || "";
  const [showAds, setShowAds] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });

    return () => task.cancel();
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0d1b2a" }}
      edges={["top", "left", "right"]}
    >
      <ScrollView style={{ padding: 16 }}>
        {/* English News Section */}
        <NewsSection
          gameName={Currentgame}
          title="English News"
          sourceId="english_news"
          langParams="&hl=en"
          defaultExpanded={true}
        />
        {/* <Text>Ad </Text> */}
        {showAds && (
          <View style={styles.ad}>
            <Text style={styles.adText}>{t("common.ad")}</Text>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        )}
        {/* Arabic News Section */}
        <NewsSection
          gameName={Currentgame}
          title="الأخبار العربية"
          sourceId="arabic_news"
          langParams="&hl=ar"
          defaultExpanded={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default GameNewsScreen;

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 38,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 8,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  chevronIcon: {
    marginRight: 8,
  },
  listContainer: {
    marginTop: 5,
  },
  card: {
    backgroundColor: "#142744",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "left",
  },
  date: {
    fontSize: 12,
    color: "gray",
    marginTop: 4,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginBottom: 38,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});
