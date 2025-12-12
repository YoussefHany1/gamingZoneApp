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

const SkeletonGameCard = () => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1, // تكرار لا نهائي
      false // عدم العكس (يبدأ من البداية دائماً)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.cardContainer}>
      {/* محاكاة صورة الغلاف */}
      <View style={styles.coverPlaceholder}>
        <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* محاكاة عنوان اللعبة */}
      <View style={styles.titlePlaceholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 10,
    borderRadius: 16,
    margin: 10,
    backgroundColor: COLORS.secondary + "20",
    height: 270,
    width: 160,
  },
  coverPlaceholder: {
    width: 140,
    height: 190,
    borderRadius: 10,
    backgroundColor: COLORS.secondary, // لون رمادي أساسي
    overflow: "hidden",
    marginBottom: 16,
  },
  titlePlaceholder: {
    width: 100,
    height: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SkeletonGameCard;
