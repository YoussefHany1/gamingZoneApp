import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
function Loading() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#779bdd" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

export default Loading;
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0c1a33",
  },
  loadingText: {
    color: "#779bdd",
    marginTop: 10,
    fontSize: 16,
  },
});
