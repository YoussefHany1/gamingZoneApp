import messaging from "@react-native-firebase/messaging";
import firestore, {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import * as Notifications from "expo-notifications";
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
// Constants to avoid magic strings and ensure consistency
const COLLECTIONS = {
  USERS: "users",
  PREFERENCES: "notificationPreferences",
};

const ERRORS = {
  MISSING_PARAMS: "⚠️ Missing required parameters: userId or token/topic.",
  FCM_FAIL: "❌ FCM Operation Failed:",
};

class NotificationService {
  /**
   * Generate consistent topic name for FCM strictly adhering to regex
   * Allowed: [a-zA-Z0-9-_.~%]+
   * @param {string} category
   * @param {string} sourceName
   * @returns {string}
   */
  static getTopicName(category, sourceName) {
    if (!category || !sourceName) return "";

    const sanitizedSource = sourceName
      .toLowerCase()
      .replace(/[^a-z0-9-_.~%]/g, "_") // Replace invalid chars
      .replace(/_+/g, "_")             // Remove duplicate underscores
      .replace(/^_|_$/g, "");          // Trim leading/trailing underscores

    return `${category}_${sanitizedSource}`;
  }

  /**
   * Handle Topic Subscription (Subscribe/Unsubscribe)
   * @param {string} topicName
   * @param {boolean} subscribe - true to subscribe, false to unsubscribe
   * @returns {Promise<boolean>}
   */
  static async _handleTopicSubscription(topicName, subscribe) {
    if (!topicName) return false;

    const action = subscribe ? "subscribeToTopic" : "unsubscribeFromTopic";
    const logPrefix = subscribe ? "✅ Subscribed to" : "🚫 Unsubscribed from";

    try {
      if (subscribe) {
        await messaging().subscribeToTopic(topicName); // خطأ 1: (E:49)
      } else {
        await messaging().unsubscribeFromTopic(topicName);
      }
      console.log(`${logPrefix}: ${topicName}`);
      return true;
    } catch (error) {
      console.error(`${ERRORS.FCM_FAIL} ${action} ${topicName}`, error);
      return false;
    }
  }

  /**
   * Subscribe to a specific topic
   */
  static async subscribeToTopic(topicName) {
    return this._handleTopicSubscription(topicName, true);
  }

  /**
   * Unsubscribe from a specific topic
   */
  static async unsubscribeFromTopic(topicName) {
    return this._handleTopicSubscription(topicName, false);
  }

  /**
   * Save user preference and immediately sync with FCM
   * Optimistic UI updates should call this.
   * @param {string} userId
   * @param {string} category
   * @param {string} sourceName
   * @param {boolean} enabled
   */
  static async toggleNotificationPreference(userId, category, sourceName, enabled) {
    if (!userId) {
      console.warn(ERRORS.MISSING_PARAMS);
      return;
    }

    const topicId = this.getTopicName(category, sourceName);

    try {
      // 1. Perform FCM operation first (Critical Path)
      const fcmSuccess = await this._handleTopicSubscription(topicId, enabled);

      if (!fcmSuccess) {
        throw new Error("FCM Subscription failed, aborting Firestore write.");
      }

      // 2. Save to Firestore
      const prefRef = doc(
        collection(
          doc(firestore(), COLLECTIONS.USERS, userId),
          COLLECTIONS.PREFERENCES
        ),
        topicId
      );

      await setDoc(prefRef, {
        category,
        sourceName,
        enabled,
        topicId,
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error("❌ Failed to toggle preference:", error);
      // Here you might want to trigger a UI toast or rollback state
    }
  }

  /**
   * Fetch all user preferences
   * @param {string} userId
   * @returns {Promise<Object>} { topicId: boolean }
   */
  static async getUserPreferences(userId) {
    if (!userId) return {};

    try {
      const preferencesRef = collection(
        doc(firestore(), COLLECTIONS.USERS, userId),
        COLLECTIONS.PREFERENCES
      );
      const snapshot = await getDocs(preferencesRef);
      if (snapshot.empty) return {};

      const preferences = {};
      snapshot.forEach((doc) => {
        // Optimization: Read directly from doc.data() to avoid prototype overhead
        preferences[doc.id] = doc.data().enabled;
      });

      return preferences;
    } catch (error) {
      console.error("❌ Failed to fetch preferences:", error);
      return {};
    }
  }

  /**
   * Bulk Sync Preferences (Useful for App Start or Restore)
   * Uses Promise.allSettled for better fault tolerance
   */
  static async syncUserPreferences(userId, preferences) {
    console.log("🔄 Starting Bulk Sync...");

    const operations = Object.entries(preferences).map(([topic, enabled]) => {
      // Return the promise so Promise.allSettled can track it
      return enabled
        ? this.subscribeToTopic(topic)
        : this.unsubscribeFromTopic(topic);
    });

    const results = await Promise.allSettled(operations);

    // Optional: Log failures only
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`⚠️ ${failures.length} sync operations failed.`);
    } else {
      console.log("✅ Bulk Sync Completed Successfully");
    }
  }

  /**
   * Save or Update User FCM Token
   * @param {string} userId
   * @param {string} fcmToken
   */
  static async saveFCMToken(userId, fcmToken) {
    if (!userId || !fcmToken) {
      console.warn(ERRORS.MISSING_PARAMS);
      return;
    }

    try {
      // 7. التعديل هنا: استخدام الدوال المستوردة doc و collection و setDoc
      const userRef = doc(firestore(), COLLECTIONS.USERS, userId); // خطأ E:184 سابقاً تم حله هنا أيضاً

      await setDoc(userRef,
        {
          fcmToken,
          lastActive: serverTimestamp(), // خطأ E:187 سابقاً تم حله هنا أيضاً
          // Only set createdAt if it doesn't exist (handled by merge: true, but createdAt usually shouldn't update)
        },
        { merge: true }
      );
      console.log("✅ FCM Token Synced");
    } catch (error) {
      console.error("❌ Token Sync Error:", error);
    }
  }

  /**
   * Debugging: Schedule a local notification
   */
  static async testLocalNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "GTAV: Available Free on the Epic Games Store Until May 21st",
          body: "System Check: notifications are working.",
          sound: "default",
          categoryIdentifier: "news_notifications",
          badge: 1,
          // إضافة مرفقات للصورة (تعمل بشكل أساسي مع iOS، وفي أندرويد تعتمد على نسخة النظام)
          attachments: [
            {
              url: 'https://media.rockstargames.com/rockstargames-newsite/uploads/b4546f96a016d9da31a9353e9b38d6aafe984436.jpg',
              identifier: 'test-image',
              typeHint: 'image'
            }
          ],
        },
        trigger: null, // immediate
      });
    } catch (error) {
      console.error("❌ Local Notification Failed:", error);
    }
  }
}

export default NotificationService;