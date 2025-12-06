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

const SlideshowSkeleton = () => {
  // 1. قيمة مشتركة للتحريك الأفقي (بدلاً من الشفافية)
  const translateX = useSharedValue(-width);

  // 2. حلقة التحريك (Infinite Loop)
  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }), // تحريك من اليسار لليمين
      -1, // تكرار لا نهائي
      false // عدم العكس (يبدأ من جديد دائماً)
    );
  }, []);

  // 3. تطبيق الستايل المتحرك
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* خلفية مكان الصورة - ثابتة الآن */}
      <View style={styles.imagePlaceholder} />

      {/* أماكن النصوص - ثابتة الآن */}
      <View style={styles.textContainer}>
        <View style={[styles.textLine, { width: "80%" }]} />
        <View style={[styles.textLine, { width: "60%", marginTop: 8 }]} />
      </View>

      {/* طبقة الوميض المتحركة (Shimmer Overlay) */}
      <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400, // نفس ارتفاع الـ Swiper
    width: "100%",
    backgroundColor: COLORS.secondary,
    position: "relative",
    overflow: "hidden", // ضروري لضمان بقاء الوميض داخل الحاوية
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
  },
  textContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: "flex-end",
    height: "30%",
    backgroundColor: COLORS.primary + "80",
  },
  textLine: {
    height: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    alignSelf: "center",
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export default SlideshowSkeleton;
