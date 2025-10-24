import React from "react";
import { Linking, Text, StyleSheet, Image, Pressable } from "react-native";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import useFeed from "../hooks/useFeed";

function Slideshow() {
  const { articles, loading, error } = useFeed("news", "games_mix");

  if (loading) return <Text>Loading...</Text>;
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
                  ? // item.image ||
                    // item.enclosure?.[0]?.["url"]?.[0] ||
                    // item.enclosure?.[0]?.link ||
                    // item["media:thumbnail"]?.[0] ||
                    // item["media:content"]?.[0]?.["url"]?.[0]
                    {
                      uri: item.thumbnail,
                      // item.image ||
                      // item.enclosure?.[0]?.["url"]?.[0] ||
                      // item.enclosure?.[0]?.link ||
                      // item["media:thumbnail"]?.[0] ||
                      // item["media:content"]?.[0]?.["url"]?.[0],
                    }
                  : require("../assets/image-not-found.webp")
              }
            />
            <LinearGradient
              colors={["transparent", "#0c1a33"]} // From Black to Transparent
              style={styles.gradient}
            />
            <Text style={styles.headline}>{item.title.substring(0, 100)}</Text>
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
