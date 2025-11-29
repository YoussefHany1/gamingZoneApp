import { useEffect } from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

const DropdownSkeleton = () => {
  const { t } = useTranslation();
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
      <Text style={styles.header}>latest news</Text>
      {/* محاكاة صندوق الاختيار */}
      <View
        style={[
          styles.pickerContainer,
          { borderColor: "transparent", height: 50, justifyContent: "center" },
        ]}
      >
        <View
          style={{
            width: "80%",
            height: 20,
            backgroundColor: COLORS.secondary + "40",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <Shimmer />
        </View>
      </View>

      {/* محاكاة تفاصيل الموقع */}
      <View style={styles.siteDesc}>
        {/* الصورة الدائرية */}
        <View
          style={[
            styles.siteImg,
            { backgroundColor: COLORS.secondary + "40", overflow: "hidden" },
          ]}
        >
          <Shimmer />
        </View>

        <View style={styles.siteText}>
          {/* اسم الموقع */}
          <View
            style={{
              width: 150,
              height: 30,
              backgroundColor: COLORS.secondary + "40",
              borderRadius: 4,
              marginBottom: 10,
              overflow: "hidden",
              alignSelf: "flex-end", // لمحاكاة row-reverse
            }}
          >
            <Shimmer />
          </View>
          {/* وصف الموقع */}
          <View
            style={{
              width: 250,
              height: 60,
              backgroundColor: COLORS.secondary + "40",
              borderRadius: 4,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <Shimmer />
          </View>

          {/* الأزرار */}
          <View style={styles.buttons}>
            <View
              style={{
                width: 100,
                height: 35,
                backgroundColor: COLORS.secondary + "40",
                borderRadius: 6,
                marginRight: 24,
                overflow: "hidden",
              }}
            >
              <Shimmer />
            </View>
            <View
              style={{
                width: 30,
                height: 30,
                backgroundColor: COLORS.secondary + "40",
                borderRadius: 15,
                overflow: "hidden",
              }}
            >
              <Shimmer />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // flex: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  header: {
    textAlign: "center",
    alignSelf: "center",
    fontSize: 28,
    fontWeight: "bold",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 80,
    paddingVertical: 10,
    marginBottom: 30,
    marginTop: 20,
    borderRadius: 16,
    color: "white",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.secondary + "50",
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  siteDesc: {
    flexDirection: "row-reverse",
    marginTop: 20,
  },
  siteImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  siteText: {
    marginHorizontal: 10,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
});

export default DropdownSkeleton;
