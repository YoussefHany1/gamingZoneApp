import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';

function SettingsScreen() {
  const navigation = useNavigation();
  const [notificationModal, setNotificationModal] = useState(false);
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('✅ User signed out');
      // onAuthStateChanged سيتكفل بالباقي
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };
  return (
    <>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => navigation.navigate('NotificationSettings')}
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
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => navigation.navigate('Profile')}
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
          onPress={console.log("Pressed")}
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
          onPress={console.log("Pressed")}
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
        {/* <Button title="تسجيل الخروج" onPress={handleSignOut} /> */}

        <TouchableOpacity
          style={[styles.categoryHeader, styles.categoryHeaderSignout]}
          onPress={handleSignOut}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.signout}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c1a33",
    paddingHorizontal: 16,
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
    color: "#fff",
    marginRight: 8,
  },
  signout: {
    fontSize: 18,
    fontWeight: "600",
    color: "red",
    marginRight: 8,
  },
  categoryHeaderSignout: {
    backgroundColor: "rgba(221, 119, 119, 0.2)",
  }
});

export default SettingsScreen;