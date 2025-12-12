import React, { Suspense } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import "./i18n";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import NotificationService from "./notificationService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { View, InteractionManager } from "react-native";
import analytics from "@react-native-firebase/analytics";
import COLORS from "./constants/colors";
import { adUnitId } from "./constants/config";
import Loading from "./Loading";
import HomeScreen from "./screens/HomeScreen";
import NewsScreen from "./screens/NewsScreen";
import GamesScreen from "./screens/GamesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import GameDetails from "./components/GameDetails";
import UserGamesScreen from "./screens/UserGamesScreen";
import NotificationSettings from "./components/Notification";
import Profile from "./components/Profile";
import LanguageScreen from "./screens/LanguageSelect";
import GameNewsScreen from "./screens/GameNewsScreen";

const LoginScreen = React.lazy(() => import("./screens/LoginScreen"));
const RegisterScreen = React.lazy(() => import("./screens/RegisterScreen"));
const ForgotPasswordScreen = React.lazy(() =>
  import("./screens/ForgotPasswordScreen")
);

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
      <Stack.Screen name="NewsScreen" component={NewsScreen} />
    </Stack.Navigator>
  );
}

function GamesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GamesScreen" component={GamesScreen} />
      <Stack.Screen name="GameDetails" component={GameDetails} />
      <Stack.Screen name="GameNewsScreen" component={GameNewsScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={{ title: t("navigation.titles.notificationSettings") }}
      />
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{ title: t("navigation.titles.accountSettings") }}
      />
      <Stack.Screen
        name="UserGamesScreen"
        component={UserGamesScreen}
        options={{ title: t("navigation.titles.gamesList") }}
      />
      <Stack.Screen
        name="LanguageScreen"
        component={LanguageScreen}
        options={{ title: t("settings.menu.changeLanguage") }}
      />

      <Stack.Screen
        name="GameDetails"
        component={GameDetails}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MainAppTabs() {
  const { t } = useTranslation();
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    // تفعيل الإعلانات بعد تحميل القائمة
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.darkBackground,
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
              Home: focused ? "home" : "home-outline",
              News: focused ? "newspaper" : "newspaper-outline",
              Settings: focused ? "settings" : "settings-outline",
              Games: focused ? "game-controller" : "game-controller-outline",
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
      {showAds && (
        <View style={{ alignItems: "center", width: "100%" }}>
          <BannerAd
            unitId={adUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>
      )}
    </>
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
  const routeNameRef = React.useRef();
  const navigationRef = React.useRef();

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(async (newUser) => {
      setUser(newUser);

      if (newUser) {
        // عند تسجيل الدخول، نحدد الـ User ID للـ Analytics
        await analytics().setUserId(newUser.uid);
        // يمكن أيضًا إضافة خصائص للمستخدم
        await analytics().setUserProperty(
          "email_verified",
          String(newUser.emailVerified)
        );
      } else {
        // عند تسجيل الخروج (اختياري)
        await analytics().setUserId(null);
      }

      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Effect 2: إدارة إشعارات FCM (يعمل فقط عند وجود user)
  useEffect(() => {
    let unsubscribeOnMessage;
    let unsubscribeTokenRefresh;

    const setupFcm = async () => {
      if (user) {
        console.log("✅ Initializing FCM for user:", user.uid);

        try {
          // ... (باقي كود إعداد القنوات والصلاحيات من دالتك القديمة initFcm) ...

          // 1. القنوات (Channels)
          await Notifications.setNotificationChannelAsync(
            "news_notifications",
            {
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
            }
          );

          // 2. الصلاحيات (Permissions)
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            // حفظ التوكن
            const token = await messaging().getToken();
            await NotificationService.saveFCMToken(user.uid, token);

            // مزامنة التفضيلات
            const preferences = await NotificationService.getUserPreferences(
              user.uid
            );
            await NotificationService.syncUserPreferences(
              user.uid,
              preferences
            );

            // 3. الاستماع للإشعارات (Foreground Handler)
            unsubscribeOnMessage = messaging().onMessage(
              async (remoteMessage) => {
                try {
                  const title =
                    remoteMessage?.notification?.title ||
                    remoteMessage?.data?.title ||
                    "📰 New News!";
                  const body =
                    remoteMessage?.notification?.body ||
                    remoteMessage?.data?.body ||
                    "";
                  const image =
                    remoteMessage?.notification?.android?.imageUrl ||
                    remoteMessage?.notification?.imageUrl ||
                    remoteMessage?.data?.thumbnail;

                  const notificationContent = {
                    title,
                    body,
                    data: remoteMessage?.data || {},
                    sound: "default",
                    badge: 1,
                    categoryIdentifier: "news_notifications",
                  };

                  if (image) {
                    notificationContent.attachments = [
                      {
                        url: image,
                        identifier: "news-image",
                        typeHint: "image",
                      },
                    ];
                  }

                  // جدولة الإشعار المحلي
                  await Notifications.scheduleNotificationAsync({
                    content: notificationContent,
                    trigger: null,
                  });
                } catch (err) {
                  console.error(
                    "❌ Failed to present foreground notification:",
                    err
                  );
                }
              }
            );

            // 4. تحديث التوكن
            unsubscribeTokenRefresh = messaging().onTokenRefresh(
              async (newToken) => {
                await NotificationService.saveFCMToken(user.uid, newToken);
              }
            );
          }
        } catch (error) {
          console.error("❌ FCM init error:", error);
        }
      }
    };

    setupFcm();

    // Cleanup Function: هذا الجزء هو الأهم لمنع التكرار
    return () => {
      if (unsubscribeOnMessage) unsubscribeOnMessage();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [user]);

  if (loading) {
    return <Loading />;
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: COLORS.primary, // Suspense background color
    },
  };
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
          <StatusBar style="light" translucent={true} />
          <NavigationContainer
            ref={navigationRef}
            theme={MyTheme}
            onReady={() => {
              routeNameRef.current =
                navigationRef.current.getCurrentRoute().name;
            }}
            onStateChange={async () => {
              const previousRouteName = routeNameRef.current;
              const currentRouteName =
                navigationRef.current.getCurrentRoute().name;

              if (previousRouteName !== currentRouteName) {
                // تسجيل الشاشة الجديدة في Analytics
                await analytics().logScreenView({
                  screen_name: currentRouteName,
                  screen_class: currentRouteName,
                });
              }
              routeNameRef.current = currentRouteName;
            }}
          >
            <Suspense fallback={<Loading />}>
              {/* if user not signed in register screen will show up */}
              <Stack.Navigator
                key={user ? "user-active" : "user-guest"}
                screenOptions={{ headerShown: false }}
              >
                {auth().currentUser ? (
                  <>
                    <Stack.Screen name="MainApp" component={MainAppTabs} />
                    <Stack.Screen name="Auth" component={AuthStack} />
                  </>
                ) : (
                  <Stack.Screen name="Auth" component={AuthStack} />
                )}
                <></>
              </Stack.Navigator>
            </Suspense>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
