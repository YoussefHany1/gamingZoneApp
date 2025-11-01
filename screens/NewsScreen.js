import * as React from "react";
import { View, useWindowDimensions, StyleSheet, Text } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import LatestNews from "../components/LatestNews.js";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

const docRef = collection(db, "rss");
let rssFeeds = [];

onSnapshot(
  docRef,
  (snap) => {
    if (snap) {
      rssFeeds = [];
      snap.docs.forEach((doc) => {
        const data = doc.data();
        rssFeeds = { ...rssFeeds, ...data };
      });
    } else {
      console.log("❌ Document does not exist.");
    }
  },
  (err) => {
    console.error("🚨 Error while fetching Firestore document:", err);
  }
);

function normalized(input) {
  return input
    .replace(/[^\p{L}\p{N}]+/gu, " ") // أي شيء ليس حرف أو رقم -> مسافة
    .trim() // إزالة المسافات من الأطراف
    .replace(/\s+/g, "_") // كل مجموعة مسافات -> underscore
    .toLowerCase();
}

// News Route Component
const NewsRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.news?.[0]);
  console.log("NewsRoute selected:", selected);

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
const ReviewsRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.reviews?.[0]);

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

const EsportsRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.esports?.[0]);

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
const HardwareRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.hardware?.[0]);

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
  const [routes] = React.useState([
    { key: "news", title: "News" },
    { key: "reviews", title: "Reviews" },
    { key: "esports", title: "Esports" },
    { key: "hardware", title: "Hardware" },
  ]);

  const renderScene = SceneMap({
    news: NewsRoute,
    reviews: ReviewsRoute,
    esports: EsportsRoute,
    hardware: HardwareRoute,
  });

  return (
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
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0c1a33",
  },
  standaloneContainer: {
    flex: 1,
    backgroundColor: "#0c1a33",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  standaloneTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  standaloneSubtitle: {
    color: "#a9b7d0",
    fontSize: 14,
  },
  tabBar: {
    backgroundColor: "#0a0f1c",
    paddingTop: 50,
  },
  tabIndicator: {
    backgroundColor: "#516996",
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});