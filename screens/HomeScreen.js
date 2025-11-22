import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slideshow from "../components/Slideshow";
import LatestNews from "../components/LatestNews";
// import Loading from "../Loading";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import COLORS from "../constants/colors";
const adUnitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-4635812020796700~2053599689";
const sections = [
  <Slideshow website="vg247" category="news" />,
  <LatestNews category="news" limit={5} showDropdown={false} />,
  <View style={{ alignItems: "center", width: "100%", marginVertical: 55 }}>
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.MEDIUM_RECTANGLE}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
    />
  </View>,
  <LatestNews category="reviews" limit={5} showDropdown={false} />,
  <View style={{ alignItems: "center", width: "100%", marginVertical: 55 }}>
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.MEDIUM_RECTANGLE}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
    />
  </View>,
  <LatestNews category="esports" limit={5} showDropdown={false} />,
  <View style={{ alignItems: "center", width: "100%", marginVertical: 55 }}>
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.MEDIUM_RECTANGLE}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
    />
  </View>,
  <LatestNews category="hardware" limit={5} showDropdown={false} />,
];

function Home() {
  const renderItem = ({ item }) => item;

  return (
    <>
      <SafeAreaView edges={["right", "left"]} style={styles.container}>
        <FlatList
          data={sections}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </>
  );
}
export default Home;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
});
