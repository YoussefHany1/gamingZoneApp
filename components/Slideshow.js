import { Linking, Text, StyleSheet, Image, Pressable } from "react-native";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import useFeed from "../hooks/useFeed";
import SkeletonSlideshow from "../skeleton/SkeletonSlideshow";
import COLORS from "../constants/colors";

function Slideshow({ website, category }) {
  const { articles, loading, error } = useFeed(category, website);

  if (loading) return <SkeletonSlideshow />;
  if (error) return <Text>Error: {error.message}</Text>;
  return (
    <>
      <Swiper
        showsButtons
        autoplay
        loadMinimalSize
        showsPagination={false}
        autoplayTimeout={5}
        style={styles.swiper}
        nextButton={<Text style={{ color: "#506996", fontSize: 70 }}>›</Text>}
        prevButton={<Text style={{ color: "#506996", fontSize: 70 }}>‹</Text>}
      >
        {articles.map((item, index) => (
          <Pressable
            key={index}
            style={{ position: "relative", width: "100%" }}
            onPress={() => {
              // Open the link in a web browser
              Linking.openURL(item.link[0]);
            }}
          >
            <Image
              style={styles.thumbnail}
              source={
                item.thumbnail
                  ? {
                      uri: item.thumbnail,
                    }
                  : require("../assets/image-not-found.webp")
              }
            />
            <LinearGradient
              colors={["transparent", COLORS.primary]}
              style={styles.gradient}
            />
            <Text style={styles.headline} numberOfLines={3}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </Swiper>
    </>
  );
}
export default Slideshow;

const styles = StyleSheet.create({
  swiper: {
    height: 400,
    // marginBottom: 20,
  },
  thumbnail: {
    // flex: 1,
    height: 400,
    resizeMode: "cover",
    width: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "120%",
  },
  headline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
    color: "white",
    padding: 16,
  },
});
