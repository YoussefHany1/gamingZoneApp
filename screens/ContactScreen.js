import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ID } from "react-native-appwrite";
import { databases } from "../lib/appwrite"; // تأكد من المسار الصحيح
import auth from "@react-native-firebase/auth";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

// استبدل هذه القيم بالقيم الخاصة بمشروعك في Appwrite
// يفضل وضعها في ملف constants/config.js
const DATABASE_ID = "6930389a0033ba85bfe1";
const COLLECTION_ID = "contact";

const ContactScreen = ({ navigation }) => {
  const { i18n, t } = useTranslation();
  const [type, setType] = useState("suggestion"); // suggestion, problem, other
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const currentLang = i18n.language;
  // محاولة جلب إيميل المستخدم الحالي إذا كان مسجلاً
  const currentUser = auth().currentUser;
  const [email, setEmail] = useState(currentUser?.email || "");

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t("common.error"), t("settings.contact.messagePlaceholder"), [
        { text: t("common.ok") },
      ]);
      return;
    }
    if (message.length > 5000) {
      Alert.alert(t("common.error"), t("contact.messageTooLong"), [
        { text: t("common.ok") },
      ]);
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      Alert.alert(t("common.error"), t("settings.contact.invalidEmail"), [
        { text: t("common.ok") },
      ]);
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        type: type,
        message: message,
        email: email,
        userId: currentUser ? currentUser.uid : null,
      });

      Alert.alert(t("common.ok"), t("settings.contact.success"), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error sending feedback:", error);
      Alert.alert(t("common.error"), t("settings.contact.error"), [
        { text: t("common.ok") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderTypeButton = (value, icon, label) => (
    <TouchableOpacity
      style={[styles.typeButton, type === value && styles.typeButtonActive]}
      onPress={() => setType(value)}
    >
      <Ionicons
        name={icon}
        size={24}
        color={type === value ? "#fff" : "#fff"}
      />
      <Text style={[styles.typeText, type === value && styles.typeTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Type Selection */}
        <Text style={styles.label}>{t("settings.contact.typeLabel")}</Text>
        <View style={styles.typesContainer}>
          {renderTypeButton(
            "suggestion",
            "bulb-outline",
            t("settings.contact.types.suggestion")
          )}
          {renderTypeButton(
            "problem",
            "warning-outline",
            t("settings.contact.types.problem")
          )}
          {renderTypeButton(
            "other",
            "chatbubble-ellipses-outline",
            t("settings.contact.types.other")
          )}
        </View>

        {/* Message Input */}
        <Text style={styles.label}>{t("settings.contact.messageLabel")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("settings.contact.messagePlaceholder")}
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
            maxLength={5000}
          />
          <Text
            style={[
              styles.charCount,
              message.length === 5000 && { color: "red" }, // تغيير اللون عند الوصول للحد الأقصى
            ]}
          >
            {message.length} / 5000
          </Text>
        </View>

        {/* Email Input */}
        <Text style={styles.label}>{t("settings.contact.emailLabel")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.emailInput]}
            placeholder="example@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t("settings.contact.send")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary, // أو الخلفية المناسبة
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "left",
  },
  typesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  typeButtonActive: {
    backgroundColor: COLORS.secondary || "#779bdd",
    borderColor: "#779bdd",
  },
  typeText: {
    marginTop: 5,
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  typeTextActive: {
    color: "#fff",
  },
  inputContainer: {
    backgroundColor: COLORS.secondary + "33",
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#779bdd",
  },
  input: {
    color: "#fff",
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    color: "#779bdd",
    fontSize: 12,
    padding: 10,
    paddingBottom: 8,
  },
  emailInput: {
    textAlign: "left",
  },
  submitButton: {
    backgroundColor: COLORS.secondary || "#779bdd",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ContactScreen;
