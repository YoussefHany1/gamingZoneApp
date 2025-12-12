import { useState, useEffect, useCallback } from "react";
import auth from "@react-native-firebase/auth";
import NotificationService from "../notificationService"; // تأكد من صحة المسار

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState({});
  const [loadingPreferences, setLoadingPreferences] = useState(true);

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
    try {
      const prefs = await NotificationService.getUserPreferences(userId);
      setPreferences(prefs || {});
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  /**
   * دالة تفعيل/تعطيل مصدر معين
   * تقبل اسم المصدر كنص (String) لتكون عامة أكثر
   */
  const toggleSource = useCallback(
    async (category, sourceName) => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const prefId = NotificationService.getTopicName(category, sourceName);
      const newValue = !preferences[prefId];

      // 1. تحديث فوري للواجهة (Optimistic Update)
      setPreferences((prev) => ({
        ...prev,
        [prefId]: newValue,
      }));

      // 2. استدعاء الخدمة للتعامل مع قاعدة البيانات و FCM
      await NotificationService.toggleNotificationPreference(
        userId,
        category,
        sourceName,
        newValue
      );
    },
    [preferences]
  );

  return {
    preferences,
    loadingPreferences,
    toggleSource,
    setPreferences, // نحتاجها إذا أردت تعديل الحالة يدوياً (مثل toggleCategory)
  };
};
