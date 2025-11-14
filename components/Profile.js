import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Button,
    Image,
    Alert,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { auth } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
// --- إزالة: import storage from '@react-native-firebase/storage'; ---
import firestore from '@react-native-firebase/firestore';

// --- !! أدخل بيانات Cloudinary الخاصة بك هنا !! ---
const CLOUDINARY_CLOUD_NAME = 'dewusw0db';
const CLOUDINARY_API_KEY = '848952698676177';
const CLOUDINARY_UPLOAD_PRESET = 'Gaming Zone'; // (الذي جعلته Unsigned)
// ---

function SettingsScreen() {
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.displayName || '');
            setImageUri(currentUser.photoURL || null);
        }
    }, [currentUser]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('الصلاحيات مطلوبة', 'نحتاج إلى صلاحيات الوصول إلى الصور.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            // --- إضافة مهمة: تحويل الصورة إلى Base64 ---
            // (Cloudinary API يفضل التعامل مع base64 أو file URI مباشرة)
            // سنستخدم file URI، لكن تأكد أن result.assets[0].uri هو file URI
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    // --- (هذه هي الدالة التي تم تغييرها) ---
    const uploadImage = async (uri) => {
        if (!uri || !uri.startsWith('file://')) {
            // إذا لم تتغير الصورة (URI هو رابط ويب)، لا تقم برفعها
            return uri;
        }

        // 1. إعداد FormData للرفع
        const data = new FormData();
        data.append('file', {
            uri: uri,
            type: `image/${uri.split('.').pop()}`, // مثل 'image/jpeg'
            name: `profile.${uri.split('.').pop()}`,
        });
        data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        data.append('api_key', CLOUDINARY_API_KEY);

        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        try {
            // 2. إرسال الطلب إلى Cloudinary
            let response = await fetch(url, {
                method: 'POST',
                body: data,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            let json = await response.json();

            if (json.secure_url) {
                return json.secure_url; // 3. إرجاع الرابط الآمن
            } else {
                console.error('❌ Cloudinary error:', json);
                throw new Error('فشل رفع الصورة إلى Cloudinary');
            }
        } catch (e) {
            console.error('❌ Error uploading image:', e);
            Alert.alert('خطأ', 'فشل رفع الصورة.');
            throw e; // إيقاف العملية
        }
    };

    // --- (دالة الحفظ تبقى كما هي - لا تحتاج أي تعديل) ---
    const handleSave = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            // 1. رفع الصورة (الدالة الجديدة ستُستخدم هنا)
            const newPhotoURL = await uploadImage(imageUri);

            // 2. تحديث ملف المصادقة (Auth)
            await updateProfile(currentUser, {
                displayName: name,
                photoURL: newPhotoURL,
            });

            // 3. تحديث ملف Firestore (للتزامن)
            await firestore().collection('users').doc(currentUser.uid).update({
                displayName: name,
                photoURL: newPhotoURL,
            });

            setLoading(false);
            Alert.alert('تم', 'تم تحديث بياناتك بنجاح.');
        } catch (error) {
            setLoading(false);
            console.error('❌ Error saving profile:', error);
            Alert.alert('Error', 'فشل حفظ التغييرات.');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Sign out error:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>الإعدادات</Text>

            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                <Image
                    style={styles.avatar}
                    source={imageUri ? { uri: imageUri } : require('../assets/icon.png')}
                />
                <Text style={styles.changePicText}>تغيير الصورة</Text>
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="الاسم"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
            />

            {loading ? (
                <ActivityIndicator size="large" color="#779bdd" />
            ) : (
                <Button title="حفظ التغييرات" onPress={handleSave} color="#779bdd" />
            )}

            <View style={styles.separator} />

            <Button title="تسجيل الخروج" onPress={handleSignOut} color="#d9534f" />
        </SafeAreaView>
    );
}

export default SettingsScreen;

// ... (نفس الـ styles من الرد السابق)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0c1a33',
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 30,
        marginTop: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#779bdd',
    },
    changePicText: {
        color: '#779bdd',
        marginTop: 10,
        fontSize: 16,
    },
    input: {
        width: '100%',
        backgroundColor: '#1a2a47',
        color: '#fff',
        padding: 15,
        borderRadius: 5,
        marginBottom: 20,
        fontSize: 16,
    },
    separator: {
        height: 40,
    },
});