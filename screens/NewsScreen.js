import { useState, useEffect, useCallback, useMemo } from "react"; // 1. إضافة useMemo
import { useWindowDimensions, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView, TabBar } from "react-native-tab-view";
import LatestNews from "../components/LatestNews.js";
import Loading from "../Loading.js";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import useRssFeeds from "../hooks/useRssFeeds";

// دالة موحدة لكل التبويبات
const GenericNewsRoute = ({ rssFeeds, categoryKey }) => {
  // --- بداية التعديل: ترتيب وفصل المصادر ---
  const { i18n } = useTranslation();

  const feedList = useMemo(() => {
    const list = rssFeeds[categoryKey] || [];

    // 1. فصل المجموعات
    const arList = list.filter((item) => item.language === "ar");
    const enList = list.filter((item) => item.language !== "ar"); // أي لغة أخرى نعتبرها إنجليزي أو أجنبي

    // 2. الترتيب الأبجدي لكل مجموعة
    arList.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    enList.sort((a, b) => a.name.localeCompare(b.name, "en"));

    // 3. الدمج: هنا نضع العربي أولاً ثم الإنجليزي (يمكنك عكس الترتيب بتبديلهم)
    if (i18n.language === "ar") {
      return [...arList, ...enList];
    } else {
      return [...enList, ...arList];
    }
  }, [rssFeeds, categoryKey, i18n.language]);
  // --- نهاية التعديل ---

  const [selected, setSelected] = useState(feedList?.[0]);

  useEffect(() => {
    // التأكد من أن العنصر المختار موجود في القائمة الجديدة، وإلا اختر الأول
    if (
      (!selected || !feedList.find((f) => f.name === selected.name)) &&
      feedList?.length > 0
    ) {
      setSelected(feedList[0]);
    }
  }, [feedList, selected]);

  if (!selected) {
    return (
      <View style={styles.scene}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.scene}>
      <LatestNews
        website={selected?.name || ""}
        category={categoryKey}
        selectedItem={selected}
        language={selected?.language}
        websitesList={feedList} // هنا نمرر القائمة المرتبة والمقسمة
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

export default function TabViewExample() {
  const { t } = useTranslation();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const { rssFeeds } = useRssFeeds();

  const routes = useMemo(
    () => [
      { key: "news", title: t("news.tabs.news") || "News" },
      { key: "reviews", title: t("news.tabs.reviews") || "Reviews" },
      { key: "esports", title: t("news.tabs.esports") || "Esports" },
      { key: "hardware", title: t("news.tabs.hardware") || "Hardware" },
    ],
    [t]
  );

  const renderTabBar = useCallback(
    (props) => (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        labelStyle={styles.tabLabel}
        activeColor={COLORS.secondary}
        inactiveColor="#a9b7d0"
      />
    ),
    [] // مصفوفة فارغة تعني أن الدالة لن يُعاد إنشاؤها أبداً
  );

  const renderScene = useCallback(
    ({ route }) => {
      switch (route.key) {
        case "news":
          return <GenericNewsRoute rssFeeds={rssFeeds} categoryKey="news" />;
        case "reviews":
          return <GenericNewsRoute rssFeeds={rssFeeds} categoryKey="reviews" />;
        case "esports":
          return <GenericNewsRoute rssFeeds={rssFeeds} categoryKey="esports" />;
        case "hardware":
          return (
            <GenericNewsRoute rssFeeds={rssFeeds} categoryKey="hardware" />
          );
        default:
          return null;
      }
    },
    [rssFeeds]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        lazy={true}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBackground,
  },
  scene: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    backgroundColor: COLORS.darkBackground,
  },
  tabIndicator: {
    backgroundColor: COLORS.secondary,
  },
  tabLabel: {
    // color: "#a9b7d0",
    fontSize: 16,
    fontWeight: "600",
  },
});
