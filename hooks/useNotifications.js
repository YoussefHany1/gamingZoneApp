import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import NotificationService from "../notificationService"; // تأكد من المسار الصحيح

const useNotifications = (user) => {
  useEffect(() => {
    let unsubscribeOnMessage;
    let unsubscribeTokenRefresh;

    const setupFcm = async () => {
      if (user) {
        console.log("✅ Initializing FCM for user:", user.uid);

        try {
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

    return () => {
      if (unsubscribeOnMessage) unsubscribeOnMessage();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [user]);
};

export default useNotifications;
