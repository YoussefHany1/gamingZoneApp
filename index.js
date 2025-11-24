import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import "@react-native-firebase/app";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";

import App from "./App";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Background/quit state messages handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // console.log("📨 Background message received:", remoteMessage?.messageId);
  // console.log("📨 Background message data:", remoteMessage?.data);
  console.log(
    "📨 Background message notification:",
    remoteMessage?.notification
  );

  // Handle background notification
  try {
    const title =
      remoteMessage?.notification?.title ||
      remoteMessage?.data?.title ||
      "📰 خبر جديد";
    const body =
      remoteMessage?.notification?.body || remoteMessage?.data?.body || "";

    console.log("📨 Processing background notification:", { title, body });

    // The notification will be automatically displayed by the system
    // when the app is in background/quit state
    console.log("✅ Background notification processed");
  } catch (error) {
    console.error("❌ Error handling background message:", error);
  }
});
