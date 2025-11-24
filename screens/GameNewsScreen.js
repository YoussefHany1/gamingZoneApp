import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  FlatList, // إضافة ScrollView
  Linking,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { XMLParser } from "fast-xml-parser";
import axios from "axios";

// تفعيل الأنيميشن للأندرويد
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- 1. مكون فرعي يعرض قسم أخبار واحد (قابل لإعادة الاستخدام) ---
const NewsSection = ({
  gameName,
  title,
  langParams,
  defaultExpanded = true,
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isEnabled, setIsEnabled] = useState(false); // حالة السويتش

  // دمج اسم اللعبة مع باراميترات اللغة المطلوبة
  const RSS_URL = `https://news.google.com/rss/search?q=${gameName}${langParams}`;

  useEffect(() => {
    fetchRSS();
  }, [gameName]);

  const fetchRSS = async () => {
    try {
      const response = await axios.get(RSS_URL);
      const xmlText = response.data;
      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlText);
      // التعامل مع حالة وجود خبر واحد أو عدة أخبار أو لا شيء
      const channel = jsonObj?.rss?.channel;
      let items = [];

      if (channel?.item) {
        items = Array.isArray(channel.item) ? channel.item : [channel.item];
      }

      items.sort((a, b) => {
        // تحويل نصوص التاريخ إلى كائنات تاريخ للمقارنة
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

  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

  return (
    <View
      style={[
        styles.sectionContainer,
        langParams === "&hl=ar" ? { direction: "rtl" } : { direction: "ltr" },
      ]}
    >
      {/* رأس القسم (Header) */}
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
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={styles.categorySwitch}
        />
      </TouchableOpacity>

      {/* محتوى القائمة (يظهر عند الفتح) */}
      {expanded && (
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#779bdd" />
          ) : news.length === 0 ? (
            <Text style={{ color: "gray", textAlign: "center" }}>
              No news found.
            </Text>
          ) : (
            <FlatList
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200, borderRadius: 8 }}
              data={news}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  key={item.guid}
                  style={styles.card}
                  onPress={() => item.link && Linking.openURL(item.link)}
                >
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.date}>{item.pubDate}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
};

// --- 2. الشاشة الرئيسية ---
function GameNewsScreen({ route, navigation }) {
  // قيمة افتراضية للتجربة إذا لم يتم تمرير اسم اللعبة
  const Currentgame = route.params?.gameName || "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d1b2a" }}>
      <View style={{ padding: 16 }}>
        {/* القسم العربي */}
        <NewsSection
          gameName={Currentgame}
          title="الأخبار العربية"
          langParams="&hl=ar"
          defaultExpanded={true}
        />
        {/* القسم الإنجليزي */}
        <NewsSection
          gameName={Currentgame}
          title="English News"
          langParams="&hl=en"
          defaultExpanded={true}
        />
      </View>
    </SafeAreaView>
  );
}

export default GameNewsScreen;

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 30,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 8,
    marginBottom: 0, // إزالة المسافة لأن القائمة ستأتي تحته مباشرة
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
  categorySwitch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
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
});
