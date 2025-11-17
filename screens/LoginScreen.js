import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Alert, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from 'react-i18next';

GoogleSignin.configure({
    webClientId: '1003577837647-jpm4m77muign33bu3inaihqf6p82b50v.apps.googleusercontent.com',
});

function LoginScreen({ navigation }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }
        try {
            await auth().signInWithEmailAndPassword(email, password);
            console.log(`${t('auth.login.success')})`);
            // سيقوم onAuthStateChanged في App.js بالباقي
        } catch (error) {
            console.error(`${t('auth.login.failed')})`, error);
            // الخطأ [auth/invalid-credential] سيظهر هنا إذا كانت البيانات خاطئة
            Alert.alert('error while trying to login', error.message);
        }
    };

    // --- دالة تسجيل الدخول بجوجل ---
    const onGoogleButtonPress = async () => {
        try {
            await GoogleSignin.hasPlayServices();

            const userInfoResponse = await GoogleSignin.signIn();

            // طباعة اللوج (كما هي)
            console.log('Google User Info:', JSON.stringify(userInfoResponse, null, 2));

            // [تم التصحيح] التحقق من المسار الصحيح: userInfoResponse.data.idToken
            // اللوغ الذي أرسلته يثبت أن التوكن موجود داخل .data
            const idToken = userInfoResponse.data?.idToken;

            if (!idToken) {
                console.error('❌ Google sign in error: idToken not found in userInfoResponse.data', JSON.stringify(userInfoResponse));
                Alert.alert('خطأ', 'لم نتمكن من الحصول على معرف جوجل (idToken not found in data).');
                return;
            }

            // إنشاء بيانات الاعتماد
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);

            // تسجيل الدخول (أو التسجيل) في Firebase
            await auth().signInWithCredential(googleCredential);

            console.log('✅ Signed in with Google credential');
            // سيقوم onAuthStateChanged في App.js بالباقي

        } catch (error) {
            console.error('❌ Google sign in error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the login flow');
            } else {
                Alert.alert('Error', error.message);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder={t('auth.login.emailPlaceholder')}
                    placeholderTextColor="#aaa" // تحسين الوضوح
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    placeholderTextColor="#aaa" // تحسين الوضوح
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotPasswordButton}
                >
                    <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleLogin} style={styles.button}>
                <Text style={styles.buttonText}>{t('auth.login.title')}</Text>
            </TouchableOpacity>
            <LinearGradient
                colors={["#10574b", "#3174f1", "#e92d18", "#c38d0c"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity onPress={onGoogleButtonPress} style={{ alignItems: "center", flexDirection: "row" }}>
                    <Ionicons name="logo-google" size={28} color="white" />
                    <Text style={styles.buttonText}> {t('auth.login.googleSignIn')}</Text>
                </TouchableOpacity>
            </LinearGradient>
            <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.newAccButton}
            >
                <Text style={styles.buttonText}>{t('auth.login.createAccount')}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0c1a33',
    },
    logo: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        // marginBottom: 2
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
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
    forgotPasswordButton: {

    },
    forgotPasswordText: {
        color: "gray"
    },
    button: {
        backgroundColor: "#516996",
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
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
        textAlign: "center"
    },
    newAccButton: {
        borderWidth: 2,
        borderColor: "#516996",
        padding: 15,
        borderRadius: 12,
        textAlign: "center",
        justifyContent: "center",
        marginTop: 35,

    }
});