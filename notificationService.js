import messaging from "@react-native-firebase/messaging";
import firestore from '@react-native-firebase/firestore'; // ✅
// ❌ (احذف كل imports الويب بتاعة db, auth, doc, setDoc, collection, getDocs)
import * as Notifications from "expo-notifications";

/**
 * Generate consistent topic name for FCM
 * @param {string} category - Category name (news, reviews, hardware)
 * @param {string} sourceName - Source name
 * @returns {string} Topic name
 */
export function getTopicName(category, sourceName) {
  const sanitizedSource = sourceName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${category}_${sanitizedSource}`;
}

/**
 * Subscribe FCM token to a topic
 * @param {string} topicName - Topic name to subscribe to
 * @returns {Promise<boolean>} Success status
 */
export async function subscribeToTopic(topicName) {
  try {
    console.log(`🔄 Attempting to subscribe to topic: ${topicName}`);
    await messaging().subscribeToTopic(topicName);
    console.log(`✅ Successfully subscribed to topic: ${topicName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to subscribe to topic ${topicName}:`, error);
    return false;
  }
}

/**
 * Unsubscribe FCM token from a topic
 * @param {string} topicName - Topic name to unsubscribe from
 * @returns {Promise<boolean>} Success status
 */
export async function unsubscribeFromTopic(topicName) {
  try {
    console.log(`🔄 Attempting to unsubscribe from topic: ${topicName}`);
    await messaging().unsubscribeFromTopic(topicName);
    console.log(`✅ Successfully unsubscribed from topic: ${topicName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to unsubscribe from topic ${topicName}:`, error);
    return false;
  }
}

/**
 * Save user notification preference to Firestore
 * @param {string} userId - User ID
 * @param {string} category - Category name
 * @param {string} sourceName - Source name
 * @param {boolean} enabled - Whether notifications are enabled
 */
export async function saveNotificationPreference(
  userId,
  category,
  sourceName,
  enabled
) {
  try {
    const prefId = getTopicName(category, sourceName);
    const prefRef = firestore()
      .collection("users")
      .doc(userId)
      .collection("notificationPreferences")
      .doc(prefId);

    await prefRef.set({
      category,
      sourceName,
      enabled,
      updatedAt: new Date(),
    });

    console.log(`✅ Saved preference: ${prefId} = ${enabled}`);
  } catch (error) {
    console.error("❌ Failed to save notification preference:", error);
  }
}

/**
 * Get user notification preferences from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Preferences object
 */
export async function getUserNotificationPreferences(userId) {
  try {
    if (!userId) {
      console.warn("⚠️ Missing userId");
      return {};
    }

    const prefsRef = firestore()
      .collection("users")
      .doc(userId)
      .collection("notificationPreferences");
    const snapshot = await prefsRef.get();

    const preferences = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      preferences[doc.id] = data.enabled;
    });

    return preferences;
  } catch (error) {
    console.error("❌ Failed to get notification preferences:", error);
    return {};
  }
}

/**
 * Sync user preferences with FCM topics
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences object
 */
export async function syncUserPreferences(userId, preferences) {
  try {
    console.log("🔄 Syncing user preferences with FCM topics...");
    console.log("📋 Preferences to sync:", preferences);

    const promises = [];

    for (const [prefId, enabled] of Object.entries(preferences)) {
      console.log(`🔄 Processing preference: ${prefId} = ${enabled}`);
      if (enabled) {
        promises.push(subscribeToTopic(prefId));
      } else {
        promises.push(unsubscribeFromTopic(prefId));
      }
    }

    const results = await Promise.all(promises);
    console.log(
      "✅ Synced user preferences with FCM topics. Results:",
      results
    );
  } catch (error) {
    console.error("❌ Failed to sync user preferences:", error);
  }
}

/**
 * Save FCM token to user profile
 * @param {string} userId - User ID
 * @param {string} fcmToken - FCM token
 */
export async function saveFCMToken(userId, fcmToken) {
  try {
    if (!userId || !fcmToken) {
      console.warn("⚠️ Missing userId or fcmToken");
      return;
    }

    const userRef = firestore().collection("users").doc(userId); // ✅
    await userRef.set(
      {
        fcmToken,
        lastActive: new Date(),
        createdAt: new Date(),
      },
      { merge: true }
    );

    console.log("✅ Saved FCM token to user profile");
  } catch (error) {
    console.error("❌ Failed to save FCM token:", error);
    // Don't throw the error, just log it to prevent app crashes
  }
}

/**
 * Test notification function for debugging
 */
export async function testNotification() {
  try {
    console.log("🧪 Testing local notification...");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧪 Test Notification",
        body: "This is a test notification to verify the system is working",
        sound: "default",
        badge: 1,
        categoryIdentifier: "news_notifications",
      },
      trigger: null, // immediate
    });
    console.log("✅ Test notification scheduled");
  } catch (error) {
    console.error("❌ Failed to schedule test notification:", error);
  }
}

/**
 * Test FCM topic subscription
 */
export async function testTopicSubscription() {
  try {
    console.log("🧪 Testing FCM topic subscription...");

    // Subscribe to a test topic
    const testTopic = "test_topic";
    await messaging().subscribeToTopic(testTopic);
    console.log(`✅ Subscribed to test topic: ${testTopic}`);

    // Wait a moment then unsubscribe
    setTimeout(async () => {
      try {
        await messaging().unsubscribeFromTopic(testTopic);
        console.log(`✅ Unsubscribed from test topic: ${testTopic}`);
      } catch (error) {
        console.error("❌ Failed to unsubscribe from test topic:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("❌ Failed to test topic subscription:", error);
  }
}
