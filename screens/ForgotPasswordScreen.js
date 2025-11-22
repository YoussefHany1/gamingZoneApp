import { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Text, Alert, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';

function ForgotPasswordScreen({ navigation }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await auth().sendPasswordResetEmail(email);
            Alert.alert(
                'Sent successfully',
                'A password reset link has been sent to your email. (Please also check your Spam folder)',
                [{ text: 'OK', onPress: () => navigation.goBack() }] // العودة لشاشة الدخول
            );
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            // معالجة الأخطاء الشائعة
            if (error.code === 'auth/user-not-found') {
                Alert.alert('Error', 'No account is registered with this email address.');
            } else {
                Alert.alert('Error', 'An error occurred while trying to send the email.', "Try again later.");
            }
        }
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
            <TextInput
                style={styles.input}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TouchableOpacity
                style={styles.button}
                onPress={handleResetPassword}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{t('auth.forgotPassword.sendButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.buttonText}>{t('auth.forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: COLORS.primary
    },
    logo: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        // marginBottom: 2
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        color: "white",
        backgroundColor: "rgba(119, 155, 221, 0.2)",
        padding: 15,
        borderRadius: 5,
        marginBottom: 25,
        fontSize: 16
    },
    button: {
        backgroundColor: COLORS.secondary,
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
        marginHorizontal: 10
    },
    buttonText: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center"
    },
    backButton: {
        borderWidth: 2,
        borderColor: COLORS.secondary,
        padding: 15,
        borderRadius: 12,
        textAlign: "center",
        justifyContent: "center"
    }
});