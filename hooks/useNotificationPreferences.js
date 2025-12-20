import { useState, useEffect, useCallback } from "react";
import auth from "@react-native-firebase/auth";
import NotificationService from "../notificationService"; // تأكد من صحة المسار

let globalPreferencesCache = null;

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState(globalPreferencesCache || {});
  const [loadingPreferences, setLoadingPreferences] = useState(
    !globalPreferencesCache
  );

  // تحميل تفضيلات المستخدم عند فتح الـ Hook
  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      loadUserPreferences(currentUser.uid);
    } else {
      setLoadingPreferences(false);
    }
  }, []);

  const loadUserPreferences = async (userId) => {
    if (!globalPreferencesCache) setLoadingPreferences(true);
    try {
      const prefs = await NotificationService.getUserPreferences(userId);
      // تحديث الكاش والـ state بالبيانات اللي جت من السيرفر
      globalPreferencesCache = prefs || {};
      setPreferences(globalPreferencesCache);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const toggleSource = useCallback(
    async (category, sourceName) => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const prefId = NotificationService.getTopicName(category, sourceName);
      const newValue = !preferences[prefId];
      // 2. تحديث الكاش العالمي فوراً (عشان لو خرجت ورجعت تلاقيها متغيرة)
      globalPreferencesCache = {
        ...globalPreferencesCache,
        [prefId]: newValue,
      };

      // 3. تحديث واجهة المستخدم فوراً (Optimistic Update)
      setPreferences(globalPreferencesCache);

      try {
        await NotificationService.toggleNotificationPreference(
          userId,
          category,
          sourceName,
          newValue
        );
      } catch (error) {
        // لو حصل خطأ في الحفظ، نرجع القيمة القديمة
        console.error("Failed to save preference", error);
        globalPreferencesCache = {
          ...globalPreferencesCache,
          [prefId]: !newValue,
        };
        setPreferences({ ...globalPreferencesCache });
      }
    },
    [preferences]
  );

  return {
    preferences,
    loadingPreferences,
    toggleSource,
    setPreferences,
  };
};
