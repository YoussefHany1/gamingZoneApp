import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import COLORS from "./constants/colors";
import { useTranslation } from "react-i18next";

function Loading() {
  const { t } = useTranslation();
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#779bdd" />
      <Text style={styles.loadingText}>{t("common.loading")}</Text>
    </View>
  );
}

export default Loading;
const styles = StyleSheet.create({
  loadingContainer: {
    // ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: "#779bdd",
    marginTop: 10,
    fontSize: 16,
  },
});
