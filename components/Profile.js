import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  InteractionManager,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import firestore from "@react-native-firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Loading from "../Loading";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import Constants from "expo-constants";
import CustomPicker from "./CustomPicker";

const CLOUDINARY_CLOUD_NAME =
  Constants?.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME ??
  process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY =
  Constants?.expoConfig?.extra?.CLOUDINARY_API_KEY ??
  process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_UPLOAD_PRESET =
  Constants?.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET ??
  process.env.CLOUDINARY_UPLOAD_PRESET;

function ProfileScreen() {
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth().currentUser);
  const [showAds, setShowAds] = useState(false);
  const { t } = useTranslation();

  // 3. تفعيل الإعلانات بعد انتهاء تحميل الواجهة الأساسية
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // يمكنك إضافة setTimeout هنا إذا أردت تأخيراً إضافياً بالمللي ثانية
      setShowAds(true);
    });

    return () => task.cancel(); // تنظيف المهمة عند الخروج
  }, []);

  useEffect(() => {
    if (currentUser) {
      // جلب البيانات الأساسية من Auth (سريع)
      setName(currentUser.displayName || "");
      setImageUri(currentUser.photoURL || null);

      // جلب كل البيانات (بما فيها تاريخ الميلاد) من Firestore
      const fetchUserData = async () => {
        try {
          const userDocument = await firestore()
            .collection("users")
            .doc(currentUser.uid)
            .get();

          if (userDocument.exists) {
            const userData = userDocument.data();
            // تحديث الـ State ببيانات Firestore (هي الأصح)
            setName(userData.displayName || "");
            setImageUri(userData.photoURL || null);
            setDob(userData.dob || "");
            setGender(userData.gender || "");
            setCountry(userData.country || "");
            setPlatform(userData.platform || ""); // <-- تحميل تاريخ الميلاد
          }
        } catch (error) {
          console.error("❌ Error fetching user data from Firestore:", error);
        }
      };

      fetchUserData();
    }
  }, [currentUser]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("profile.messages.permissionTitle"),
        t("profile.messages.permissionMsg")
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    if (!uri || !uri.startsWith("file://")) {
      return uri;
    }

    // 1. إعداد FormData للرفع
    const data = new FormData();
    data.append("file", {
      uri: uri,
      type: `image/${uri.split(".").pop()}`,
      name: `profile.${uri.split(".").pop()}`,
    });
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("api_key", CLOUDINARY_API_KEY);

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    try {
      // 2. إرسال الطلب إلى Cloudinary
      let response = await fetch(url, {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      let json = await response.json();

      if (json.secure_url) {
        return json.secure_url; // 3. إرجاع الرابط الآمن
      } else {
        console.error("❌ Cloudinary error:", json);
        throw new Error("Image upload failed.");
      }
    } catch (e) {
      console.error("❌ Error uploading image:", e);
      Alert.alert(t("common.error"), t("profile.messages.uploadFailed"));
      throw e;
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // رفع الصورة أولاً (لو اتغيرت)
      const newPhotoURL = await uploadImage(imageUri);

      // 1. تحديث ملف المصادقة (Auth) - بالاسم والصورة فقط
      await currentUser.updateProfile({
        displayName: name,
        photoURL: newPhotoURL,
      });

      // 2. تحديث ملف Firestore (بكل البيانات)
      await firestore().collection("users").doc(currentUser.uid).update({
        displayName: name,
        photoURL: newPhotoURL,
        dob: dob,
        gender: gender,
        country: country,
        platform: platform,
      });

      // تحديث الـ user state عشان يعكس التغييرات فوراً
      setCurrentUser(auth().currentUser);

      setLoading(false);
      Alert.alert("Done!", "Your data has been successfully updated.");
    } catch (error) {
      setLoading(false);
      console.error("❌ Error saving profile:", error);
      Alert.alert(t("common.error"), t("profile.messages.saveError"));
    }
  };
  const handleChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
      setDob(isoDate);
    }
  };
  const genderOptions = [
    { label: t("auth.register.male") || "Male", value: "male" },
    { label: t("auth.register.female") || "Female", value: "female" },
  ];
  const platformOptions = [
    { label: "", value: "" },
    { label: t("settings.profile.platforms.pc") || "PC", value: "pc" },
    {
      label: t("settings.profile.platforms.playstation") || "PlayStation",
      value: "playstation",
    },
    { label: t("settings.profile.platforms.xbox") || "Xbox", value: "xbox" },
    {
      label: t("settings.profile.platforms.android") || "Android",
      value: "android",
    },
  ];
  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {loading ? (
        <Loading />
      ) : (
        <ScrollView style={styles.subContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image
              style={styles.avatar}
              source={
                imageUri ? imageUri : require("../assets/default_profile.png")
              }
              contentFit="cover"
              transition={500}
              cachePolicy="memory-disk"
            />
            <Text style={styles.changePicText}>
              {t("settings.profile.changePic")}
            </Text>
          </TouchableOpacity>
          {/* Name Input */}
          <Text style={styles.label}>{t("settings.profile.nameLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("settings.profile.namePlaceholder")}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />
          {/* Date of Birth Input */}
          <Text style={styles.label}>{t("settings.profile.dobLabel")}</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <TextInput
              style={styles.input}
              placeholder={t("settings.profile.dobPlaceholder")}
              placeholderTextColor="#888"
              value={dob}
              editable={false}
            />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              mode="date"
              display={"default"}
              value={dob ? new Date(dob) : new Date()}
              onChange={handleChange}
            />
          )}
          {/* Gender Input */}
          <Text style={styles.label}>{t("settings.profile.genderLabel")}</Text>
          <CustomPicker
            options={genderOptions}
            selectedValue={gender}
            onValueChange={setGender}
            placeholder={t("settings.profile.genderLabel") || "Select Gender"}
          />
          {/* Platform Input */}
          <Text style={styles.label}>
            {t("settings.profile.platformLabel")}
          </Text>
          <CustomPicker
            options={platformOptions}
            selectedValue={platform}
            onValueChange={setPlatform}
            placeholder={
              t("settings.profile.platformLabel") || "Select Platform"
            }
          />
          {/* {showAds && (
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
          )} */}
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>{t("common.saveChanges")}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  subContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: "#779bdd",
  },
  changePicText: {
    color: "#779bdd",
    marginTop: 10,
    fontSize: 16,
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.button,
    color: "#fff",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  separator: {
    height: 40,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "white",
  },
  selectWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: COLORS.button,
  },
  picker: {
    marginLeft: 8,
  },
  saveBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    alignSelf: "center",
    padding: 15,
    marginTop: 20,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 30,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});
