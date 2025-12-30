import { useState } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import useFeed from "../hooks/useFeed";
import SkeletonSlideshow from "../skeleton/SkeletonSlideshow";
import COLORS from "../constants/colors";
import NewsDetails from "../screens/NewsDetailsScreen";

function Slideshow({ website, category }) {
  const { articles, loading, error } = useFeed(category, website);

  // 2. تعريف State للتحكم في ظهور التفاصيل
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  if (loading) return <SkeletonSlideshow />;
  if (error) return <Text>Error: {error.message}</Text>;

  // 3. دالة التعامل مع الضغط على الخبر
  const handlePressArticle = (item) => {
    setSelectedArticle(item);
    setModalVisible(true);
  };

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
            onPress={() => handlePressArticle(item)} // 4. استدعاء دالة فتح التفاصيل بدلاً من الرابط
          >
            <Image
              style={styles.thumbnail}
              source={
                item?.thumbnail
                  ? item.thumbnail
                  : require("../assets/image-not-found.webp")
              }
              contentFit="cover"
              // transition={500}
              cachePolicy="memory-disk"
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

      {/* 5. عرض مكون التفاصيل عند اختيار خبر */}
      {selectedArticle && (
        <NewsDetails
          article={selectedArticle}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setTimeout(() => setSelectedArticle(null), 300);
          }}
        />
      )}
    </>
  );
}
export default Slideshow;

const styles = StyleSheet.create({
  swiper: {
    height: 400,
    backgroundColor: COLORS.secondary,
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
