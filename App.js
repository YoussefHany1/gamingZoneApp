// import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons"; // أيقونات جاهزة من Expo
// import { BlurView } from "expo-blur";
import NewsScreen from "./screens/News";
import HomeScreen from "./screens/Home";
import SettingsScreen from "./screens/Settings";
import { useEffect, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
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
    // Set up authentication state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("✅ User authenticated:", user.uid);
        setUser(user);

        // Initialize FCM and sync preferences
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
      const expoPerms = await Notifications.requestPermissionsAsync();
      if (expoPerms.status !== "granted") {
        console.log("OS notification permission not granted");
      }

      // Ensure Android notification channel exists for foreground local notifications
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFFFFF",
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        console.log("FCM permission not granted");
        return;
      }

      const token = await messaging().getToken();
      console.log("FCM token:", token);

      // Save FCM token to user profile
      await saveFCMToken(userId, token);

      // Load and sync user notification preferences
      const preferences = await getUserNotificationPreferences(userId);
      await syncUserPreferences(userId, preferences);

      const unsubscribeOnMessage = messaging().onMessage(
        async (remoteMessage) => {
          console.log("FCM foreground message:", remoteMessage?.messageId);
          try {
            // Show a local notification when app is in foreground
            const title =
              remoteMessage?.notification?.title ||
              remoteMessage?.data?.title ||
              "New message";
            const body =
              remoteMessage?.notification?.body ||
              remoteMessage?.data?.body ||
              "";

            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: remoteMessage?.data || {},
              },
              trigger: null, // immediate
            });
          } catch (err) {
            console.error("Failed to present foreground notification:", err);
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
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          // animation: "shift",
          tabBarStyle: {
            // backgroundColor: "#0c1a33",
            position: "absolute",
            // left: 20,
            right: 0,
            bottom: 20,
            height: 60,
            width: "70%",
            alignSelf: "center",
            borderRadius: 30,

            backgroundColor: "rgba(9, 9, 44, 0.5)",
            borderWidth: 1,
            borderColor: "#040d1b",
            paddingHorizontal: 10,
            // Shadow for iOS
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            // Elevation for Android
            elevation: 8,
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
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "News") {
              iconName = focused ? "newspaper" : "newspaper-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#779bdd",
          tabBarInactiveTintColor: "#779bdd",
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="News" component={NewsStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    flex: 1,
    width: "100%",
    backgroundColor: "#0c1a33",
  },
});

export default App;
