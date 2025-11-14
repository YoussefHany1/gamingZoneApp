import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Alert, Image } from 'react-native';
import { auth } from '../firebase'; // تأكد من مسار ملف firebase
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
// --- إعداد Google Sign-In (يجب وضع الـ Web Client ID من Firebase) ---
GoogleSignin.configure({
    webClientId: '1003577837647-jpm4m77muign33bu3inaihqf6p82b50v.apps.googleusercontent.com',
});

function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // --- دالة تسجيل الدخول بالبريد الإلكتروني ---
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Login successful');
            // سيقوم onAuthStateChanged في App.js بالباقي
        } catch (error) {
            console.error('❌ Login failed:', error);
            Alert.alert('error while trying to login', error.message);
        }
    };

    // --- دالة تسجيل الدخول بجوجل ---
    const onGoogleButtonPress = async () => {
        try {
            await GoogleSignin.hasPlayServices();

            // قمنا بتغيير اسم المتغير إلى userInfoResponse ليعكس اللوج
            const userInfoResponse = await GoogleSignin.signIn();

            // طباعة اللوج (كما هي)
            console.log('Google User Info:', JSON.stringify(userInfoResponse, null, 2));

            // --- هذا هو التعديل المهم ---
            // التحقق من المسار الصحيح: userInfoResponse.data.idToken
            if (!userInfoResponse || !userInfoResponse.data || !userInfoResponse.data.idToken) {
                console.error('❌ Google sign in error: idToken not found in userInfo.data');
                Alert.alert('خطأ', 'لم نتمكن من الحصول على معرف جوجل (idToken not found).');
                return;
            }

            // --- الحصول على idToken من المسار الصحيح ---
            const idToken = userInfoResponse.data.idToken;

            // إنشاء بيانات الاعتماد
            const googleCredential = GoogleAuthProvider.credential(idToken);

            // تسجيل الدخول (أو التسجيل) في Firebase
            await signInWithCredential(auth, googleCredential);

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
            <Text style={styles.title}>Sign In</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotPasswordButton}
                >
                    <Text style={styles.forgotPasswordText}>Forget Password?</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleLogin} style={styles.button}>
                <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onGoogleButtonPress} style={styles.button}>
                <Ionicons name="logo-google" size={28} color="white" />
                <Text style={styles.buttonText}> Sign In with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.newAccButton}
            >
                <Text style={styles.buttonText}>Create new account</Text>
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