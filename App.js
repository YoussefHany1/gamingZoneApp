import React, { Suspense } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import './i18n';
import { useTranslation } from 'react-i18next';
import auth from '@react-native-firebase/auth';
import NotificationService from "./notificationService";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Loading from './Loading';
import HomeScreen from "./screens/HomeScreen";
import NewsScreen from "./screens/NewsScreen";
import GamesScreen from "./screens/GamesScreen";
import SettingsScreen from "./screens/SettingsScreen";
// import GameDetails from "./components/GameDetails";
// import NotificationSettings from "./components/Notification";
// import Profile from "./components/Profile";
// import WantListScreen from './screens/WantListScreen';
// import PlayedListScreen from './screens/PlayedListScreen';
// import LanguageScreen from './screens/LanguageSelect';
// import NotificationService from "./notificationService";
// import LoginScreen from './screens/LoginScreen';
// import RegisterScreen from './screens/RegisterScreen';
// import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
// import SourceSelectionScreen from './screens/SourceSelectionScreen';


// const NewsScreen = React.lazy(() => import("./screens/NewsScreen"));
// const GamesScreen = React.lazy(() => import("./screens/GamesScreen"));
// const SettingsScreen = React.lazy(() => import("./screens/SettingsScreen"));
const GameDetails = React.lazy(() => import("./components/GameDetails"));
const NotificationSettings = React.lazy(() => import("./components/Notification"));
const Profile = React.lazy(() => import("./components/Profile"));
const WantListScreen = React.lazy(() => import("./screens/WantListScreen"));
const PlayedListScreen = React.lazy(() => import("./screens/PlayedListScreen"));
const LanguageScreen = React.lazy(() => import("./screens/LanguageSelect"));
const SourceSelectionScreen = React.lazy(() => import("./screens/SourceSelectionScreen"));
const LoginScreen = React.lazy(() => import("./screens/LoginScreen"));
const RegisterScreen = React.lazy(() => import("./screens/RegisterScreen"));
const ForgotPasswordScreen = React.lazy(() => import("./screens/ForgotPasswordScreen"));


globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
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
      <Stack.Screen name="GameDetails" component={GameDetails} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: {
        backgroundColor: '#0c1a33'
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold'
      },
    }}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: t('navigation.titles.notificationSettings') }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: t('navigation.titles.accountSettings') }} />
      <Stack.Screen name="WantListScreen" component={WantListScreen} options={{ title: t('navigation.titles.wantList') }} />
      <Stack.Screen name="PlayedListScreen" component={PlayedListScreen} options={{ title: t('navigation.titles.playedList') }} />
      <Stack.Screen name="LanguageScreen" component={LanguageScreen} options={{ title: t('settings.menu.changeLanguage') }} />
      <Stack.Screen name="SourceSelectionScreen" component={SourceSelectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GamesScreen" component={GamesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GameDetails" component={GameDetails} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MainAppTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#00001c",
          borderWidth: 0,
          borderTopWidth: 0,
          paddingTop: 5,
          alignItems: "center",
        },
        tabBarActiveTintColor: "#779bdd",
        tabBarInactiveTintColor: "#779bdd",
        tabBarLabel: t(`navigation.tabs.${route.name.toLowerCase()}`),
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap = {
            "Home": focused ? "home" : "home-outline",
            "News": focused ? "newspaper" : "newspaper-outline",
            "Settings": focused ? "settings" : "settings-outline",
            "Games": focused ? "game-controller" : "game-controller-outline",
          };
          const iconName = iconMap[route.name];

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="News" component={NewsStack} />
      <Tab.Screen name="Games" component={GamesStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // إعدادات الكاش: البيانات تظل "جديدة" (Fresh) لمدة 5 دقائق.
      // بعد 5 دقائق، إذا تم فتح المكون مرة أخرى، سيتم جلب البيانات في الخلفية (Stale-While-Revalidate).
      staleTime: 1000 * 60 * 5, // 5 minutes
      // مدة الاحتفاظ بالبيانات حتى لو لم يتم استخدامها، بعدها يتم حذفها من الكاش.
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(async (newUser) => {
      setUser(newUser);
      setLoading(false);
      if (newUser) {
        console.log("✅ User authenticated:", newUser.uid);
        try {
          await initFcm(newUser.uid);
        } catch (error) {
          console.error("❌ Failed to initialize FCM:", error);
        }
      } else {
        console.log("❌ User not authenticated, showing Auth stack.");
      }
      // Set loading false only after initial auth check and FCM init attempt (if user exists)
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const initFcm = async (userId) => {
    try {
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
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification opened app from background:', remoteMessage.notification);
      });
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('Notification opened app from quit state:', remoteMessage.notification);
            // ✅ حذفنا دالة handleNotificationNavigation
            // النتيجة: التطبيق سيفتح ويبدأ من الشاشة الرئيسية (Home)
          }
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

      // ✅ Updated: Save FCM token using the Service
      await NotificationService.saveFCMToken(userId, token);

      // ✅ Updated: Load and sync user notification preferences using the Service
      const preferences = await NotificationService.getUserPreferences(userId);
      await NotificationService.syncUserPreferences(userId, preferences);

      const unsubscribeOnMessage = messaging().onMessage(
        async (remoteMessage) => {
          console.log(
            "📨 FCM foreground message received:",
            remoteMessage?.messageId
          );

          try {
            const title =
              remoteMessage?.notification?.title ||
              remoteMessage?.data?.title ||
              "📰 New News!";
            const body =
              remoteMessage?.notification?.body ||
              remoteMessage?.data?.body ||
              "";

            // ✅ استخراج الصورة من الإشعار أو البيانات
            const image =
              remoteMessage?.notification?.android?.imageUrl ||
              remoteMessage?.notification?.imageUrl ||
              remoteMessage?.data?.thumbnail;

            // إعداد محتوى الإشعار
            const notificationContent = {
              title,
              body,
              data: remoteMessage?.data || {},
              sound: "default",
              badge: 1,
              categoryIdentifier: "news_notifications",
            };

            // ✅ إذا وجدت صورة، أضفها للمرفقات
            if (image) {
              notificationContent.attachments = [
                { url: image, identifier: 'news-image', typeHint: 'image' }
              ];
            }

            await Notifications.scheduleNotificationAsync({
              content: notificationContent,
              trigger: null, // immediate
            });

            console.log("✅ Local notification scheduled with image check");
          } catch (err) {
            console.error("❌ Failed to present foreground notification:", err);
          }
        }
      );

      const unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (newToken) => {
          console.log("FCM token refreshed:", newToken);
          // ✅ Updated: Save new FCM token using the Service
          await NotificationService.saveFCMToken(userId, newToken);
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

  if (loading) {
    return <Loading />;
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#0c1a33', // <--- هذا هو اللون الذي سيظهر خلف الـ Suspense
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent={true} />
        <NavigationContainer theme={MyTheme}>
          <Suspense fallback={<Loading />}>
            {/* if user not signed in register screen will show up */}
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (
                <Stack.Screen name="MainApp" component={MainAppTabs} />
              ) : (
                <Stack.Screen name="Auth" component={AuthStack} />
              )}
            </Stack.Navigator>
          </Suspense>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;