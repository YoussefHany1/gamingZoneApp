import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import COLORS from "../constants/colors";

// const { width } = Dimensions.get("window");

const SlideshowSkeleton = () => {
  // 1. Shared Value for Opacity Animation
  const opacity = useSharedValue(0.5);

  // 2. Start Animation Loop
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.ease }),
        withTiming(0.5, { duration: 1000, easing: Easing.ease })
      ),
      -1, // Infinite loop
      true // Reverse
    );
  }, []);

  // 3. Animated Style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Background / Main Image Placeholder */}
      <Animated.View style={[styles.imagePlaceholder, animatedStyle]} />

      {/* Gradient Area Placeholder (Optional, just visual spacing) */}

      {/* Title Placeholders (Lines simulating text) */}
      <View style={styles.textContainer}>
        <Animated.View
          style={[styles.textLine, { width: "80%" }, animatedStyle]}
        />
        <Animated.View
          style={[
            styles.textLine,
            { width: "60%", marginTop: 8 },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400, // Same height as your Swiper
    width: "100%",
    backgroundColor: COLORS.secondary, // Light gray background
    position: "relative",
    overflow: "hidden",
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary, // Slightly darker gray for the "bone"
  },
  textContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: "flex-end",
    height: "30%", // Area where text usually appears
    // Simulating the gradient darkening effect roughly
    backgroundColor: COLORS.primary + "80",
  },
  textLine: {
    height: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
    alignSelf: "center", // Center align because your original text is textAlign: "center"
  },
});

export default SlideshowSkeleton;
