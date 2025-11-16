import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from "react-native";
import { useState, useEffect } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

function SettingsScreen() {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(auth().currentUser);
  console.log(currentUser._user)

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      console.log('✅ User signed out');
      // onAuthStateChanged سيتكفل بالباقي
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };
  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* <Image source={require('../assets/logo.png')} style={styles.logo} /> */}
        {currentUser?._user &&
          <TouchableOpacity style={styles.userContainer} onPress={() => navigation.navigate('Profile')}>
            <Image source={
              currentUser._user.photoURL ? { uri: currentUser._user.photoURL } : require('../assets/default_profile.png')} style={styles.avatar} />
            <Text style={styles.displayName}>{currentUser._user.displayName}</Text>
          </TouchableOpacity>
        }
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="notifications"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Notification Settings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => navigation.navigate('WantListScreen')}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="bookmark"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Want to Play List</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => navigation.navigate('PlayedListScreen')}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="checkmark-sharp"
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>Played Games List</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryHeader}
        // onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name="star"
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
  userContainer: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  avatar: {
    height: 50,
    width: 50,
    borderRadius: 50,
  },
  displayName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
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