import React, { useState } from "react";
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

function LoginScreen({ navigation }) {
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

  const handleAuthError = (error, t) => {
    let errorMessage = t("auth.errors.general"); // الرسالة الافتراضية

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      errorMessage = t("auth.errors.invalidCredentials");
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = t("auth.errors.network");
    } else if (error.code === "auth/too-many-requests") {
      errorMessage =
        "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً.";
    }

    Alert.alert(t("auth.errors.generalTitle"), errorMessage);
  };

  // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(`${t("common.error")}`, `${t("auth.emptyFields")}`);
      return;
    }
    try {
      await auth().signInWithEmailAndPassword(email, password);
      console.log(`${t("auth.login.success")})`);
      navigateToMain();
      // سيقوم onAuthStateChanged في App.js بالباقي
    } catch (error) {
      console.error("Login failed", error);
      // الخطأ [auth/invalid-credential] سيظهر هنا إذا كانت البيانات خاطئة
      handleAuthError(error, t);
    }
  };

  // --- دالة تسجيل الدخول بجوجل ---
  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices();

      const userInfoResponse = await GoogleSignin.signIn();
      const idToken = userInfoResponse.data?.idToken;

      if (!idToken) {
        console.error(
          "❌ Google sign in error: idToken not found in userInfoResponse.data",
          JSON.stringify(userInfoResponse)
        );
        Alert.alert(
          "خطأ",
          "لم نتمكن من الحصول على معرف جوجل (idToken not found in data)."
        );
        return;
      }

      // إنشاء بيانات الاعتماد
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // تسجيل الدخول (أو التسجيل) في Firebase
      await auth().signInWithCredential(googleCredential);

      console.log("✅ Signed in with Google credential");
      navigateToMain();
      // سيقوم onAuthStateChanged في App.js بالباقي
    } catch (error) {
      console.error("❌ Google sign in error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled");
      } else {
        // رسالة ودية بدلاً من error.message
        Alert.alert(
          t("auth.errors.generalTitle"),
          t("auth.errors.googleSignIn")
        );
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
        <Text style={styles.title}>{t("auth.login.title")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor="#aaa" // تحسين الوضوح
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor="#aaa" // تحسين الوضوح
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>
              {t("auth.login.forgotPassword")}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>{t("auth.login.title")}</Text>
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
              {t("auth.login.googleSignIn")}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.newAccButton}
        >
          <Text style={styles.buttonText}>{t("auth.login.createAccount")}</Text>
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

export default LoginScreen;

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
  forgotPasswordButton: {},
  forgotPasswordText: {
    color: "gray",
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
