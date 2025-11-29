import { useState, useEffect, useCallback } from "react";
import { useWindowDimensions, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView, TabBar } from "react-native-tab-view";
import LatestNews from "../components/LatestNews.js";
import Loading from "../Loading.js";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import useRssFeeds from "../hooks/useRssFeeds";
import SkeletonDropdown from "../skeleton/SkeletonDropdown";

function normalized(input) {
  return input
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

const NewsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = useState(rssFeeds.news?.[0]);
  // console.log("NewsRoute selected:", selected);
  useEffect(() => {
    if (!selected && rssFeeds.news?.length > 0) {
      setSelected(rssFeeds.news[0]);
    }
  }, [rssFeeds.news, selected]);

  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected?.name || "")}
        category="news"
        selectedItem={selected}
        language={selected?.language}
        websitesList={rssFeeds.news}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

const ReviewsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = useState(rssFeeds.reviews?.[0]);
  useEffect(() => {
    if (!selected && rssFeeds.reviews?.length > 0) {
      setSelected(rssFeeds.reviews[0]);
    }
  }, [rssFeeds.reviews, selected]);
  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected?.name || "")}
        category="reviews"
        selectedItem={selected}
        language={selected?.language}
        websitesList={rssFeeds.reviews}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

const EsportsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = useState(rssFeeds.esports?.[0]);
  useEffect(() => {
    if (!selected && rssFeeds.esports?.length > 0) {
      setSelected(rssFeeds.esports[0]);
    }
  }, [rssFeeds.esports, selected]);
  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected?.name || "")}
        category="esports"
        selectedItem={selected}
        language={selected?.language}
        websitesList={rssFeeds.esports}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

const HardwareRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = useState(rssFeeds.hardware?.[0]);
  useEffect(() => {
    if (!selected && rssFeeds.hardware?.length > 0) {
      setSelected(rssFeeds.hardware[0]);
    }
  }, [rssFeeds.hardware, selected]);
  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected?.name || "")}
        category="hardware"
        selectedItem={selected}
        language={selected?.language}
        websitesList={rssFeeds.hardware}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

export default function TabViewExample() {
  const { t } = useTranslation();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const { rssFeeds, loading } = useRssFeeds();
  const [routes] = useState([
    { key: "news", title: `${t("news.tabs.news")}` },
    { key: "reviews", title: `${t("news.tabs.reviews")}` },
    { key: "esports", title: `${t("news.tabs.esports")}` },
    { key: "hardware", title: `${t("news.tabs.hardware")}` },
  ]);

  // ✅ 3. لازم نغير SceneMap علشان نقدر نمرر الـ props
  const renderScene = useCallback(
    ({ route }) => {
      switch (route.key) {
        case "news":
          return <NewsRoute rssFeeds={rssFeeds} />;
        case "reviews":
          return <ReviewsRoute rssFeeds={rssFeeds} />;
        case "esports":
          return <EsportsRoute rssFeeds={rssFeeds} />;
        case "hardware":
          return <HardwareRoute rssFeeds={rssFeeds} />;
        default:
          return null;
      }
    },
    [rssFeeds]
  );
  // if (loading) {
  //   return <SkeletonDropdown />;
  // }

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        lazy={true}
        initialLayout={{ width: layout.width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.tabIndicator}
            labelStyle={styles.tabLabel}
            activeColor={COLORS.secondary}
            inactiveColor="#a9b7d0"
          />
        )}
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
  sceneSub: {
    // marginTop: 30,
  },
  tabBar: {
    backgroundColor: COLORS.darkBackground,
  },
  tabIndicator: {
    backgroundColor: COLORS.secondary,
  },
  tabLabel: {
    color: "#a9b7d0",
    fontSize: 16,
    fontWeight: "600",
  },
});
