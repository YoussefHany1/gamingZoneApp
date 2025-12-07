import { useEffect } from "react";
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

const DropdownSkeleton = () => {
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
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.2)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Header Title Skeleton */}
      {/* يحاكي العنوان: Latest News */}
      <View style={styles.headerSkeleton}>
        <Shimmer />
      </View>

      {/* Dropdown Box Skeleton */}
      {/* يحاكي القائمة المنسدلة */}
      <View style={styles.pickerContainer}>
        <View style={styles.pickerTextLine}>
          <Shimmer />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingBottom: 20,
    marginTop: 20, // ✅ يتطابق مع marginTop في LatestNews header
  },
  headerSkeleton: {
    width: 250, // عرض تقريبي للعنوان مع الحشوة
    height: 50, // ارتفاع تقريبي للعنوان
    borderRadius: 16,
    backgroundColor: COLORS.secondary + "80", // لون أغمق قليلاً لمحاكاة خلفية العنوان
    marginBottom: 30, // ✅ نفس marginBottom في LatestNews header
    overflow: "hidden",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.secondary + "50",
    width: "90%", // عرض الـ Dropdown عادة
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderColor: "transparent",
  },
  pickerTextLine: {
    width: "40%",
    height: 15,
    backgroundColor: COLORS.secondary + "40",
    borderRadius: 4,
    overflow: "hidden",
  },
});

export default DropdownSkeleton;
