import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Image,
  ImageBackground,
} from "react-native";
import auth from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

GoogleSignin.configure({
  webClientId:
    "1003577837647-jpm4m77muign33bu3inaihqf6p82b50v.apps.googleusercontent.com",
});

function SignupScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigateToMain = () => {
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainApp",
            params: {
              screen: "Home", // اسم التاب اللي عايز تروحله
            },
          },
        ],
      });
    }, 100);
  };

  // دالة للتحقق من قوة كلمة المرور
  const validatePassword = (pass) => {
    // 1. شرط الطول (أكتر من 8 حروف)
    if (pass.length < 8) {
      return "Password must be:\n at least 8 characters long.\n at least one letter.\n at least one number.";
    }
    // 2. شرط وجود حرف كبير (Uppercase)
    // if (!/[A-Z]/.test(pass)) {
    //   return "Password must contain at least one uppercase letter.";
    // }
    // 3. شرط وجود حرف صغير (Lowercase)
    if (!/[a-z]/.test(pass)) {
      return "Password must contain at least one lowercase letter.";
    }
    // 4. شرط وجود رقم (Number)
    if (!/[0-9]/.test(pass)) {
      return "Password must contain at least one number.";
    }
    // 5. (اختياري) شرط وجود رمز خاص (!@#$%)
    // if (!/[!@#$%^&*]/.test(pass)) {
    //   return "Password must contain at least one special character (!@#$%).";
    // }

    return null; // الباسورد سليم
  };

  // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert(`${t("common.error")}`, `${t("auth.register.emptyFields")}`);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert("Weak Password", passwordError); // إظهار التنبيه بالشرط الناقص
      return; // وقف العملية وماتكملش تسجيل
    }

    try {
      await auth().createUserWithEmailAndPassword(email, password);
      console.log("✅ Sign up successful");
      navigateToMain();
      // سيقوم onAuthStateChanged في App.js بالباقي
    } catch (error) {
      console.error("❌ Sign up failed:", error);
      Alert.alert("error while trying to login", error.message);
    }
  };

  // --- دالة تسجيل الدخول بجوجل ---
  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();

      const userInfoResponse = await GoogleSignin.signIn();

      // [تم التصحيح] التحقق من المسار الصحيح: userInfoResponse.idToken
      // المكتبة الحديثة لا تستخدم .data
      const idToken = userInfoResponse.idToken;

      if (!idToken) {
        console.error(
          "❌ Google sign up error: idToken not found in response.",
          JSON.stringify(userInfoResponse)
        );
        Alert.alert(
          "خطأ",
          "لم نتمكن من الحصول على معرف جوجل (idToken not found)."
        );
        return;
      }

      // إنشاء بيانات الاعتماد
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // تسجيل الدخول (أو التسجيل) في Firebase
      await auth().signInWithCredential(googleCredential);
      console.log("✅ Signed up with Google credential");
      navigateToMain();
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
      console.log("User signed in anonymously");
      navigateToMain();
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
        <Image source={require("../assets/logo.png")} style={styles.logo} />
        <Text style={styles.title}>{t("auth.register.title")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
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
        <LinearGradient
          colors={["#10574b", "#3174f1", "#e92d18", "#c38d0c"]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            onPress={onGoogleButtonPress}
            style={{ alignItems: "center", flexDirection: "row" }}
          >
            <Ionicons name="logo-google" size={28} color="white" />
            <Text style={styles.buttonText}>
              {" "}
              {t("auth.register.googleSignUp")}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
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
