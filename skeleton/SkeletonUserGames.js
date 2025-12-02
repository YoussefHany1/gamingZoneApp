import React, { useEffect } from "react";
import { View, StyleSheet, FlatList, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import COLORS from "../constants/colors"; // تأكد من المسار الصحيح

const { width } = Dimensions.get("window");

// 1. مكون الشيمر القابل لإعادة الاستخدام (Shimmer Block)
// هذا المكون يأخذ الحجم والشكل ويطبق عليه تأثير اللمعان
const ShimmerPlaceholder = ({ style }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1250, easing: Easing.linear }),
      -1, // تكرار لا نهائي
      false // عدم العكس ليمر الضوء من اليسار لليمين دائماً
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.placeholderBase, style, { overflow: "hidden" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.5)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// 2. مكون العنصر الواحد (Skeleton Item)
// يحاكي تصميم GameItem الأصلي
const SkeletonItem = () => {
  return (
    <View style={styles.skeletonContainer}>
      {/* محاكاة الصورة */}
      <ShimmerPlaceholder style={styles.skeletonImage} />

      {/* محاكاة النصوص */}
      <View style={styles.skeletonInfo}>
        {/* محاكاة العنوان */}
        <ShimmerPlaceholder style={styles.skeletonTitle} />
        {/* محاكاة التاريخ */}
        <ShimmerPlaceholder style={styles.skeletonDate} />
      </View>

      {/* محاكاة أيقونة الحذف */}
      <ShimmerPlaceholder style={styles.skeletonIcon} />
    </View>
  );
};

// 3. القائمة الكاملة (The List Component)
const UserGamesSkeleton = () => {
  const dummyData = Array(4).fill(0); // عدد العناصر الوهمية

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <FlatList
        data={dummyData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={() => <SkeletonItem />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // لون العنصر الرمادي الأساسي قبل مرور الضوء عليه
  placeholderBase: {
    backgroundColor: COLORS.secondary ? COLORS.secondary + "40" : "#ccc", // درجة شفافية من لونك الثانوي
  },
  skeletonContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(119, 155, 221, 0.1)", // نفس خلفية الـ GameItem الأصلية
    borderRadius: 12,
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  skeletonImage: {
    width: 80,
    height: 105,
    borderRadius: 8,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skeletonTitle: {
    width: "70%",
    height: 20,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonDate: {
    width: "40%",
    height: 14,
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
  },
});

export default UserGamesSkeleton;
