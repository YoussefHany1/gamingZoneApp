import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  ImageBackground,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import COLORS from "../constants/colors";
import CustomPicker from "../components/CustomPicker";

const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig.extra;

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

function SignupScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("male");

  const genderOptions = [
    { label: t("auth.register.male") || "Male", value: "male" },
    { label: t("auth.register.female") || "Female", value: "female" },
  ];

  // دالة للتحقق من قوة كلمة المرور
  const validatePassword = (pass) => {
    // فحص مبسط (أو يمكنك استخدام نفس شروطك السابقة ولكن بإرجاع نص مترجم)
    if (pass.length < 8 || !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
      // نرجع true للإشارة إلى وجود خطأ، أو نرجع النص المترجم مباشرة
      return t("auth.validation.passwordRequirements");
    }
    return null;
  };

  // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
  const handleSignup = async () => {
    if (!email || !password || !name || !country) {
      Alert.alert(`${t("common.error")}`, `${t("auth.register.emptyFields")}`);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert(t("auth.validation.passwordTitle"), passwordError);
      return; // وقف العملية وماتكملش تسجيل
    }

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      await user.updateProfile({
        displayName: name,
      });

      // store additional user info in Firestore
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        displayName: name,
        email: email,
        country: country,
        gender: gender,
        photoURL: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        platform: "",
        dob: "",
      });

      // console.log("✅ Sign up successful");
      // سيقوم onAuthStateChanged في App.js بالباقي
    } catch (error) {
      console.error("❌ Sign up failed:", error);
      let msg = t("auth.errors.general");

      if (error.code === "auth/email-already-in-use") {
        msg = t("auth.errors.emailAlreadyInUse");
      } else if (error.code === "auth/weak-password") {
        msg = t("auth.errors.weakPassword");
      } else if (error.code === "auth/invalid-email") {
        msg = "البريد الإلكتروني غير صالح.";
      }

      Alert.alert(t("auth.errors.generalTitle"), msg);
    }
  };

  // --- دالة تسجيل الدخول بجوجل ---
  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.idToken;

      if (!idToken) {
        console.error(
          "❌ Google sign up error: idToken not found in response.",
          JSON.stringify(userInfoResponse)
        );
        Alert.alert(t("common.error"), t("auth.idTokenError"));
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // تسجيل الدخول (أو التسجيل) في Firebase
      await auth().signInWithCredential(googleCredential);
      // console.log("✅ Signed up with Google credential");
    } catch (error) {
      console.error("❌ Google sign up error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled the login flow");
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };
  const handleAnonymousLogin = async () => {
    try {
      await auth().signInAnonymously();
      // console.log("User signed in anonymously");
      // App.js سيتولى تحويل المستخدم للصفحة الرئيسية تلقائياً
    } catch (error) {
      console.error("Anonymous login failed", error);
      Alert.alert("Error", error.message);
    }
  };
  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            contentFit="cover"
            transition={500}
            cachePolicy="memory-disk"
          />
          <Text style={styles.title}>{t("auth.register.title")}</Text>
          <View style={styles.inputContainer}>
            {/* Name Input */}
            <TextInput
              style={styles.input}
              placeholder={t("auth.register.namePlaceholder")}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#ccc"
            />
            {/* Email Input */}
            <TextInput
              style={styles.input}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {/* Gender Input */}
            <CustomPicker
              options={genderOptions}
              selectedValue={gender}
              onValueChange={setGender}
              placeholder={
                t("auth.register.genderPlaceholder") || "Select Gender"
              }
            />
            {/* Password Input */}
            <TextInput
              style={styles.input}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>
              {t("auth.register.signUpButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onGoogleButtonPress}
            style={{
              textAlign: "center",
              justifyContent: "center",
            }}
          >
            <LinearGradient
              colors={["#10574b", "#3174f1", "#e92d18", "#c38d0c"]}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="logo-google" size={28} color="white" />
              <Text style={styles.buttonText}>
                {" "}
                {t("auth.register.googleSignUp")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newAccButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.buttonText}>
              {t("auth.register.haveAnAccount")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAnonymousLogin}
            style={styles.guestButton}
          >
            <Text style={styles.guestButtonText}>
              {t("auth.guest") || "Continue as Guest"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

export default SignupScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 220,
    height: 220,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  input: {
    color: "white",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    fontSize: 16,
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  gradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  newAccButton: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    textAlign: "center",
    justifyContent: "center",
    marginTop: 35,
  },
  guestButton: {
    marginTop: 15,
    padding: 10,
    alignItems: "center",
  },
  guestButtonText: {
    color: "#ccc",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
