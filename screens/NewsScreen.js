import React, { useState, useEffect } from "react"; // ✅
import { useWindowDimensions, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import LatestNews from "../components/LatestNews.js";
import firestore from '@react-native-firebase/firestore';

// const docRef = collection(db, "rss");
// let rssFeeds = [];

// onSnapshot(
//   docRef,
//   (snap) => {
//     if (snap) {
//       rssFeeds = [];
//       snap.docs.forEach((doc) => {
//         const data = doc.data();
//         rssFeeds = { ...rssFeeds, ...data };
//       });
//     } else {
//       console.log("❌ Document does not exist.");
//     }
//   },
//   (err) => {
//     console.error("🚨 Error while fetching Firestore document:", err);
//   }
// );

function normalized(input) {
  return input
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

// News Route Component
const NewsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = React.useState(rssFeeds.news?.[0]);
  console.log("NewsRoute selected:", selected);
  React.useEffect(() => {
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

// Reviews Route Component
const ReviewsRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = React.useState(rssFeeds.reviews?.[0]);
  React.useEffect(() => {
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
  const [selected, setSelected] = React.useState(rssFeeds.esports?.[0]);
  React.useEffect(() => {
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

// Hardware Route Component
const HardwareRoute = ({ rssFeeds }) => {
  const [selected, setSelected] = React.useState(rssFeeds.hardware?.[0]);
  React.useEffect(() => {
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

// Standalone Hardware Component (for backward compatibility)
export const Hardware = () => {
  return (
    <View style={styles.standaloneContainer}>
      <Text style={styles.standaloneTitle}>Hardware</Text>
      <Text style={styles.standaloneSubtitle}>
        Latest hardware news and reviews here.
      </Text>
    </View>
  );
};

// Standalone Reviews Component (for backward compatibility)
export const Reviews = () => {
  return (
    <View style={styles.standaloneContainer}>
      <Text style={styles.standaloneTitle}>Reviews</Text>
      <Text style={styles.standaloneSubtitle}>
        Latest game reviews will appear here.
      </Text>
    </View>
  );
};

// Main Tab View Component
export default function TabViewExample() {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  // ✅ الخطوات الجديدة لجلب البيانات
  const [rssFeeds, setRssFeeds] = React.useState({}); // 1. نستخدم State
  const [loading, setLoading] = React.useState(true);
  const [routes] = React.useState([
    { key: "news", title: "News" },
    { key: "reviews", title: "Reviews" },
    { key: "esports", title: "Esports" },
    { key: "hardware", title: "Hardware" },
  ]);

  // ✅ 2. نستخدم Effect لجلب البيانات (باستخدام مكتبة الـ Native)
  React.useEffect(() => {
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

    // إلغاء الاشتراك عند إغلاق الشاشة
    return () => subscriber();
  }, []);

  // ✅ 3. لازم نغير SceneMap علشان نقدر نمرر الـ props
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'news':
        return <NewsRoute rssFeeds={rssFeeds} />; // بنمرر الـ prop هنا
      case 'reviews':
        return <ReviewsRoute rssFeeds={rssFeeds} />; // وهنا
      case 'esports':
        return <EsportsRoute rssFeeds={rssFeeds} />; // وهنا
      case 'hardware':
        return <HardwareRoute rssFeeds={rssFeeds} />; // وهنا
      default:
        return null;
    }
  };

  // ✅ 4. (اختياري) ممكن نضيف شاشة تحميل
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scene}>
          <Text style={{ color: 'white' }}>Loading...</Text>
        </View>
      </SafeAreaView>
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
    paddingTop: 40,
  },
  standaloneContainer: {
    flex: 1,
    backgroundColor: "#0c1a33",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  standaloneTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  standaloneSubtitle: {
    color: "#a9b7d0",
    fontSize: 14
  },
  tabBar: {
    backgroundColor: "#0a0f1c"
  },
  tabIndicator: {
    backgroundColor: "#516996"
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "600"
  },
});