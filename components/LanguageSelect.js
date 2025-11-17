import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    Linking,
    Modal,
    TouchableOpacity
} from "react-native";
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates'; // لتحديث التطبيق عند تغيير اتجاه اللغة
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

function LanguageSelect({ visible, onClose }) {
    const { t, i18n } = useTranslation(); // <--- تفعيل الترجمة والوصول للكائن i18n

    const toggleLanguage = async () => {
        const currentLang = i18n.language;
        const nextLang = currentLang === 'ar' ? 'en' : 'ar';
        const isRTL = nextLang === 'ar';

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
        <Modal
            animationType="slide"
            backdropColor="#0c1a33"
            visible={visible}
            onRequestClose={onClose} style={styles.modalContainer}>
            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={toggleLanguage}
                >
                    <View style={styles.categoryHeaderLeft}>
                        <Ionicons
                            name="language"
                            size={20}
                            color="#779bdd"
                            style={styles.chevronIcon}
                        />
                        {/* العنوان المترجم */}
                        <Text style={styles.categoryTitle}>{t('settings.language')}</Text>
                    </View>

                    {/* عرض اللغة الحالية في الجهة المقابلة */}
                    <Text style={{ color: "#779bdd", fontWeight: "bold" }}>
                        {t('settings.currentLang')}
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    )
}
export default LanguageSelect;

const styles = StyleSheet.create({
    header: { padding: 40 }
})