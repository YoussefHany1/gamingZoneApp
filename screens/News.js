import * as React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
// import rssFeeds from "../data.json";
import LatestNews from "../components/LatestNews";
// import DropdownPicker from "../components/DropdownPicker";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

const docRef = collection(db, "rss");
// console.log("Listening to Firestore document...");
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
      // console.log("✅ Current data: ", rssFeeds);
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
const NewsRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.news?.[0]);
  console.log("NewsRoute selected:", selected);
  return (
    <View style={styles.scene}>
      {/* <DropdownPicker /> */}
      <LatestNews
        website={normalized(selected.name)}
        category="news"
        selectedItem={selected}
        language={selected.language}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

const ReviewsRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.reviews?.[0]);
  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected.name)}
        category="reviews"
        selectedItem={selected}
        language={selected.language}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

const HardwareRoute = () => {
  const [selected, setSelected] = React.useState(rssFeeds.hardware?.[0]);
  return (
    <View style={styles.scene}>
      <LatestNews
        website={normalized(selected.name)}
        category="hardware"
        selectedItem={selected}
        language={selected.language}
        onChangeFeed={(item) => setSelected(item)}
      />
    </View>
  );
};

export default function TabViewExample() {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: "news", title: "News" },
    { key: "reviews", title: "Reviews" },
    { key: "hardware", title: "Hardware" },
  ]);

  const renderScene = SceneMap({
    news: NewsRoute,
    reviews: ReviewsRoute,
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
          style={{ backgroundColor: "#0a0f1c", paddingTop: 50 }}
          indicatorStyle={{ backgroundColor: "#516996" }}
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
});
