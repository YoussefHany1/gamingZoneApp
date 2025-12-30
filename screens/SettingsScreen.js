import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

function SettingsScreen() {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(auth().currentUser);
  const { t } = useTranslation();
  const isAnonymous = currentUser?.isAnonymous;
  // console.log(currentUser);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      console.log("✅ User signed out");
      // onAuthStateChanged سيتكفل بالباقي
    } catch (error) {
      console.error("❌ Sign out error:", error);
    }
  };
  return (
    <>
      <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
        {/* <Image source={require('../assets/logo.png')} style={styles.logo} /> */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.userContainer}
            onPress={() =>
              isAnonymous ? handleSignOut() : navigation.navigate("Profile")
            }
          >
            {isAnonymous ? (
              <Image
                source={require("../assets/anonymous.png")}
                style={styles.avatar}
                contentFit="cover"
                transition={500}
                cachePolicy="memory-disk"
              />
            ) : (
              <Image
                source={
                  currentUser?._user?.photoURL
                    ? { uri: currentUser._user.photoURL }
                    : require("../assets/default_profile.png")
                }
                style={styles.avatar}
                contentFit="cover"
                transition={500}
                cachePolicy="memory-disk"
              />
            )}

            <Text style={styles.displayName}>
              {currentUser?._user?.displayName
                ? currentUser?._user?.displayName
                : t("auth.login.signInButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => navigation.navigate("NotificationSettings")}
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="notifications"
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.notifications")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Lists Screen */}
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => navigation.navigate("UserListsScreen")}
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="list"
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.myLists")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() =>
              Linking.openURL(
                "https://play.google.com/store/apps/details?id=com.yh.gamingzone"
              )
            }
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="star"
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.rateUs")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => navigation.navigate("ContactScreen")}
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="chatbubble-ellipses-sharp" // أو mail-open
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.contactUs")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => navigation.navigate("LanguageScreen")}
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="language"
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.changeLanguage")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() =>
              Linking.openURL("https://youssefhany1.github.io/gamingZoneApp2/")
            }
          >
            <View style={styles.categoryHeaderLeft}>
              <Ionicons
                name="shield-checkmark-sharp"
                size={20}
                color="#779bdd"
                style={styles.chevronIcon}
              />
              <Text style={styles.categoryTitle}>
                {t("settings.menu.privacyPolicy")}
              </Text>
            </View>
          </TouchableOpacity>
          {isAnonymous ? null : (
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
                <Text style={styles.signout}>{t("settings.menu.signOut")}</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  userContainer: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingVertical: 20,
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
    alignSelf: "center",
  },
  categoryHeader: {
    marginVertical: 10,
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
    marginBottom: 20,
  },
});

export default SettingsScreen;
