import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  InteractionManager,
} from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates"; // لتحديث التطبيق عند تغيير اتجاه اللغة
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";

function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const [showAds, setShowAds] = useState(false);

  // 3. تفعيل الإعلانات بعد انتهاء تحميل الواجهة الأساسية
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // يمكنك إضافة setTimeout هنا إذا أردت تأخيراً إضافياً بالمللي ثانية
      setShowAds(true);
    });

    return () => task.cancel(); // تنظيف المهمة عند الخروج
  }, []);

  const toggleLanguage = async () => {
    const currentLang = i18n.language;

    const nextLang = currentLang === "ar" ? "en" : "ar";
    const isRTL = nextLang === "ar";

    // تغيير اللغة في المكتبة
    await i18n.changeLanguage(nextLang);

    // التعامل مع اتجاه الشاشة (RTL/LTR)
    if (isRTL !== I18nManager.isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);

      // إعادة تشغيل التطبيق لتطبيق تغيير الاتجاه
      try {
        // تأخير بسيط لضمان حفظ الإعدادات قبل إعادة التشغيل
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 500);
      } catch (e) {
        console.log("Failed to reload app");
      }
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={toggleLanguage}
        >
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryTitle}>English</Text>
            {i18n.language === "en" && (
              <Ionicons name="checkmark-sharp" size={24} color="#779bdd" />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={toggleLanguage}
        >
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryTitle}>العربية</Text>
            {i18n.language === "ar" && (
              <Ionicons name="checkmark-sharp" size={24} color="#779bdd" />
            )}
          </View>
        </TouchableOpacity>
        {showAds && (
          <View style={styles.ad}>
            <Text style={styles.adText}>{t("common.ad")}</Text>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE} // حجم مستطيل كبير
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
export default LanguageSelect;

const styles = StyleSheet.create({
  container: { padding: 40 },
  categoryHeader: {
    marginVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    borderRadius: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  chevronIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});
