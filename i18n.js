import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
    en: {
        translation: en
    },
    ar: {
        translation: ar
    }
};

// --- التعديل هنا ---
// نحصل على قائمة اللغات المدعومة من الجهاز
const locales = Localization.getLocales();

// نأخذ كود اللغة الأول (e.g., "en" or "ar")
// نستخدم (optional chaining ?. ) لضمان عدم حدوث خطأ إذا كانت القائمة فارغة
const systemLanguage = locales[0]?.languageCode;
// --------------------

i18n
    .use(initReactI18next) // يمرر i18n إلى react-i18next
    .init({
        resources,
        // نستخدم اللغة التي حصلنا عليها، أو "en" كاحتياطي
        lng: I18nManager.isRTL ? 'ar' : 'en',
        fallbackLng: 'en', // اللغة الاحتياطية إذا لم تكن لغة الجهاز مدعومة
        compatibilityJSON: 'v3', // للتوافق مع بنية ملفات JSON
        interpolation: {
            escapeValue: false // React يقوم بذلك بالفعل
        },
        react: {
            useSuspense: false // يفضل إيقافه في React Native
        }
    });

export default i18n;