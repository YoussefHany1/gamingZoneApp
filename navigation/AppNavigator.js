import React, { useState, useEffect } from "react";
import { InteractionManager } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import * as Notifications from "expo-notifications";
// Constants & Config
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";

// Screens & Components
import HomeScreen from "../screens/HomeScreen";
import NewsScreen from "../screens/NewsScreen";
import GamesScreen from "../screens/GamesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import GameDetails from "../screens/GameDetailsScreen";
import UserGamesScreen from "../screens/UserGamesScreen";
import NotificationSettings from "../components/Notification";
import Profile from "../components/Profile";
import LanguageScreen from "../screens/LanguageSelect";
import GameNewsScreen from "../screens/GameNewsScreen";
const ContactScreen = React.lazy(() => import("../screens/ContactScreen"));
// Lazy Loaded Screens
const LoginScreen = React.lazy(() => import("../screens/LoginScreen"));
const RegisterScreen = React.lazy(() => import("../screens/RegisterScreen"));
const ForgotPasswordScreen = React.lazy(() =>
  import("../screens/ForgotPasswordScreen")
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Internal Stacks ---

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
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
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
      <Stack.Screen
        name="ContactScreen"
        component={ContactScreen}
        options={{ title: t("settings.contact.title") }}
      />
    </Stack.Navigator>
  );
}

// --- Main Exported Navigators ---

export function MainAppTabs() {
  const { t } = useTranslation();
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    const getPermission = async () => {
      // هذه الدالة تطلب الإذن من المستخدم
      const { status } = await Notifications.requestPermissionsAsync();

      // (اختياري) يمكنك التحقق من الحالة هنا
      if (status === "granted") {
        console.log("تم السماح بالإشعارات!");
      } else {
        console.log("لم يتم السماح بالإشعارات");
      }
    };

    getPermission();
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
            return (
              <Ionicons name={iconMap[route.name]} size={size} color={color} />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="News" component={NewsStack} />
        <Tab.Screen name="Games" component={GamesStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>

      {/* {showAds && (
        <View style={{ alignItems: "center", width: "100%" }}>
          <BannerAd
            unitId={adUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      )} */}
    </>
  );
}

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
