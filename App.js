import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
import HomeScreen from "./screens/HomeScreen";
import NewsScreen from "./screens/NewsScreen";
import GamesScreen from "./screens/GamesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useEffect, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import {
  saveFCMToken,
  getUserNotificationPreferences,
  syncUserPreferences,
} from "./notificationService";
import "./firebase";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="News" component={NewsScreen} />
    </Stack.Navigator>
  );
}

function GamesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GamesScreen" component={GamesScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function App() {
  const [user, setUser] = useState(null);

useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("✅ User authenticated:", user.uid);
      setUser(user);
      try {
        await initFcm(user.uid);
      } catch (error) {
        console.error("❌ Failed to initialize FCM:", error);
      }
    } else {
      console.log("❌ User not authenticated, signing in anonymously...");
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("❌ Failed to sign in anonymously:", error);
      }
    }
  });

  return () => unsubscribeAuth();
}, []);

  const initFcm = async (userId) => {
    try {
      // Request OS notification permission (Android 13+ & iOS)
      const expoPerms = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      if (expoPerms.status !== "granted") {
        console.log(
          "❌ OS notification permission not granted:",
          expoPerms.status
        );
        return;
      }
      console.log("✅ OS notification permission granted");

      // Create notification channel for Android
      await Notifications.setNotificationChannelAsync("news_notifications", {
        name: "News Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#779bdd",
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        bypassDnd: false,
      });

      // Also create a default channel for compatibility
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#779bdd",
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Request FCM permission
      const authStatus = await messaging().requestPermission({
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log("❌ FCM permission not granted:", authStatus);
        return;
      }
      console.log("✅ FCM permission granted:", authStatus);

      const token = await messaging().getToken();
      console.log("📱 FCM token:", token);

      // Save FCM token to user profile
      await saveFCMToken(userId, token);

      // Load and sync user notification preferences
      const preferences = await getUserNotificationPreferences(userId);
      console.log("📋 User preferences:", preferences);
      await syncUserPreferences(userId, preferences);

      const unsubscribeOnMessage = messaging().onMessage(
        async (remoteMessage) => {
          console.log(
            "📨 FCM foreground message received:",
            remoteMessage?.messageId
          );
          console.log("📨 Message data:", remoteMessage?.data);
          console.log("📨 Message notification:", remoteMessage?.notification);

          try {
            // Show a local notification when app is in foreground
            const title =
              remoteMessage?.notification?.title ||
              remoteMessage?.data?.title ||
              "📰 خبر جديد";
            const body =
              remoteMessage?.notification?.body ||
              remoteMessage?.data?.body ||
              "";

            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: remoteMessage?.data || {},
                sound: "default",
                badge: 1,
                categoryIdentifier: "news_notifications",
              },
              trigger: null, // immediate
            });

            console.log("✅ Local notification scheduled");
          } catch (err) {
            console.error("❌ Failed to present foreground notification:", err);
          }
        }
      );

      const unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (newToken) => {
          console.log("FCM token refreshed:", newToken);
          await saveFCMToken(userId, newToken);
        }
      );

      return () => {
        unsubscribeOnMessage();
        unsubscribeTokenRefresh();
      };
    } catch (e) {
      console.error("FCM init error:", e);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0c1a33' }} edges={['right', 'bottom', 'left']}>
        <StatusBar style="light" translucent={true} />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                position: "absolute",
                // bottom: 20,
                left: "15%",      // يضمن أن الـ bar يكون في المنتصف
                right: "15%",     // نفس المسافة من الجانبين
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(9, 9, 44, 0.6)",
                borderWidth: 0,
                borderTopWidth: 0,
                // borderColor: "#040d1b",
                // تظليل
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 8,
                alignSelf: "center",
                alignItems: "center",
                alignContent: "center",
              },
              // tabBarBackground: () => (
              //   <View
              //     style={[
              //       StyleSheet.absoluteFill,
              //       { overflow: "hidden", borderRadius: 70 },
              //     ]}
              //   >
              //     <BlurView
              //       tint="dark"
              //       experimentalBlurMethod="dimezisBlurView"
              //       intensity={70}
              //       style={StyleSheet.absoluteFill}
              //     />
              //   </View>
              // ),
              tabBarActiveTintColor: "#779bdd",
              tabBarInactiveTintColor: "#779bdd",
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === "Home") {
                  iconName = focused ? "home" : "home-outline";
                } else if (route.name === "News") {
                  iconName = focused ? "newspaper" : "newspaper-outline";
                } else if (route.name === "Settings") {
                  iconName = focused ? "settings" : "settings-outline";
                } else if (route.name === "Games") {
                  iconName = focused ? "game-controller" : "game-controller-outline";
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="News" component={NewsStack} />
            <Tab.Screen name="Games" component={GamesStack} />
            <Tab.Screen name="Settings" component={SettingsStack} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     borderRadius: 30,
//     flex: 1,
//     width: "100%",
//     backgroundColor: "#0c1a33",
//   },
// });

export default App;
