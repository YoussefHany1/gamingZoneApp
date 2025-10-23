import messaging from "@react-native-firebase/messaging";
import { db, auth } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

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
    await messaging().subscribeToTopic(topicName);
    console.log(`✅ Subscribed to topic: ${topicName}`);
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
    await messaging().unsubscribeFromTopic(topicName);
    console.log(`✅ Unsubscribed from topic: ${topicName}`);
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
    const prefId = `${category}_${sourceName}`;
    const prefRef = doc(db, "users", userId, "notificationPreferences", prefId);

    await setDoc(prefRef, {
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

    const prefsRef = collection(db, "users", userId, "notificationPreferences");
    const snapshot = await getDocs(prefsRef);

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
    const promises = [];

    for (const [prefId, enabled] of Object.entries(preferences)) {
      if (enabled) {
        promises.push(subscribeToTopic(prefId));
      } else {
        promises.push(unsubscribeFromTopic(prefId));
      }
    }

    await Promise.all(promises);
    console.log("✅ Synced user preferences with FCM topics");
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

    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
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
