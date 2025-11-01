// screens/NewsDetailsScreen.js
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Linking,
  Modal,
  TouchableOpacity
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Notification from "../components/Notification";

function SettingsScreen() {
  const [notificationModal, setNotificationModal] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => setNotificationModal(true)}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Notification Settings</Text>
          </View>
          <Notification
            visible={notificationModal}
            onClose={() => setNotificationModal(false)}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => setNotificationModal(true)}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Rate Us</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => setNotificationModal(true)}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Support Us</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => setNotificationModal(true)}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Feedback</Text>
          </View>
        </TouchableOpacity>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0c1a33",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 70,
  },
  categoryHeader: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevronIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 8,
  },

});

export default SettingsScreen;