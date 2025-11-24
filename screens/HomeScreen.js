import React, { useMemo } from "react"; // تأكد من استيراد React
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slideshow from "../components/Slideshow";
import LatestNews from "../components/LatestNews";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import COLORS from "../constants/colors";

const adUnitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-4635812020796700~2053599689";

function Home() {
  // 1. تعريف البيانات فقط (وليس المكونات نفسها)
  const sectionsData = useMemo(
    () => [
      { type: "slideshow", website: "vg247", category: "news" },
      { type: "news", category: "news", limit: 5 },
      { type: "ad" },
      { type: "news", category: "reviews", limit: 5 },
      { type: "ad" },
      { type: "news", category: "esports", limit: 5 },
      { type: "ad" },
      { type: "news", category: "hardware", limit: 5 },
    ],
    []
  );

  // 2. دالة renderItem هي المسؤولة عن إنشاء المكونات
  const renderItem = ({ item }) => {
    switch (item.type) {
      case "slideshow":
        return <Slideshow website={item.website} category={item.category} />;

      case "news":
        return (
          <LatestNews
            category={item.category}
            limit={item.limit}
            showDropdown={false}
          />
        );

      case "ad":
        return (
          <View
            style={{ alignItems: "center", width: "100%", marginVertical: 55 }}
          >
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      <FlatList
        data={sectionsData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`} // مفتاح فريد مهم جداً
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
});
