import { useState, useEffect } from "react"; // ✅
import { useWindowDimensions, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import LatestNews from "../components/LatestNews.js";
import firestore from '@react-native-firebase/firestore';
import Loading from "../Loading.js";
import { useTranslation } from 'react-i18next';

function normalized(input) {
  return input
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

const NewsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = useState(rssFeeds.news?.[0]);
  console.log("NewsRoute selected:", selected);
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
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

export default function TabViewExample() {
  const { t } = useTranslation();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const [rssFeeds, setRssFeeds] = useState({});
  const [loading, setLoading] = useState(true);
  const [routes] = useState([
    { key: "news", title: `${t('news.tabs.news')}` },
    { key: "reviews", title: `${t('news.tabs.reviews')}` },
    { key: "esports", title: `${t('news.tabs.esports')}` },
    { key: "hardware", title: `${t('news.tabs.hardware')}` },
  ]);

  // ✅ 2. نستخدم Effect لجلب البيانات (باستخدام مكتبة الـ Native)
  useEffect(() => {
    const subscriber = firestore()
      .collection('rss')
      .onSnapshot(
        (snapshot) => {
          let feeds = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            feeds = { ...feeds, ...data };
          });
          setRssFeeds(feeds);
          setLoading(false);
        },
        (error) => {
          console.error("🚨 Error fetching Firestore:", error);
          setLoading(false);
        }
      );
    return () => subscriber();
  }, []);

  // ✅ 3. لازم نغير SceneMap علشان نقدر نمرر الـ props
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'news':
        return <NewsRoute rssFeeds={rssFeeds} />; // بنمرر الـ prop هنا
      case 'reviews':
        return <ReviewsRoute rssFeeds={rssFeeds} />;
      case 'esports':
        return <EsportsRoute rssFeeds={rssFeeds} />;
      case 'hardware':
        return <HardwareRoute rssFeeds={rssFeeds} />;
      default:
        return null;
    }
  };
  if (loading) {
    return (
      <Loading />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.tabIndicator}
            labelStyle={styles.tabLabel}
            activeColor="#516996"
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
    backgroundColor: "#00001c"
  },
  scene: {
    flex: 1,
    backgroundColor: "#0c1a33",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30
  },
  tabBar: {
    backgroundColor: "#0a0f1c",
  },
  tabIndicator: {
    backgroundColor: "#516996"
  },
  tabLabel: {
    color: "#a9b7d0",
    fontSize: 16,
    fontWeight: "600"
  },
});