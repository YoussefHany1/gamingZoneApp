import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");

const SkeletonNewsItem = ({ language }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const Shimmer = () => (
    <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.1)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  const isRTL = language === "ar";

  return (
    <View
      style={[
        styles.container,
        { direction: isRTL ? "rtl" : "ltr" }, // ✅ ضبط الاتجاه
      ]}
    >
      {/* Text Container */}
      <View
        style={[
          styles.textContainer,
          // ✅ ضبط الهوامش حسب اللغة كما في LatestNews
          isRTL ? { paddingLeft: 8 } : { paddingRight: 8 },
        ]}
      >
        <View style={[styles.skeletonLine, styles.titleLine]}>
          <Shimmer />
        </View>
        <View style={[styles.skeletonLine, styles.descLine]}>
          <Shimmer />
        </View>
      </View>

      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        <Shimmer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#4a5565", // ✅ نفس لون LatestNews
    borderRadius: 16, // ✅ إضافة borderRadius للتطابق
  },
  textContainer: {
    width: "65%",
  },
  thumbnail: {
    width: 135,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + "40", // شفافية قليلة لتمييز السكيلتون
    overflow: "hidden",
  },
  skeletonLine: {
    backgroundColor: COLORS.secondary + "40",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  titleLine: {
    width: "90%",
    height: 20,
    marginBottom: 12, // ✅ نفس المسافة في LatestNews
  },
  descLine: {
    width: "60%",
    height: 15,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SkeletonNewsItem;
