import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

export default function UserListsScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const user = auth().currentUser;
  const { t } = useTranslation();

  const getDisplayName = (originalName) => {
    // يمكنك تعديل مفاتيح الترجمة هنا حسب الموجود في ملفات اللغة عندك
    switch (originalName) {
      case "Playing":
        return t("games.details.listStatus.playing");
      case "Played":
        return t("games.details.listStatus.played");
      case "Want to Play":
        return t("games.details.listStatus.wantToPlay");
      default:
        return originalName; // لو الاسم مش من القائمة دي، يرجع زي ما هو
    }
  };

  useEffect(() => {
    if (!user) return;

    // 1. إنشاء القوائم الافتراضية إذا لم تكن موجودة
    const initDefaults = async () => {
      const listsRef = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists");
      const snapshot = await listsRef.get();

      if (snapshot.empty) {
        const batch = firestore().batch();
        const defaultLists = [
          { id: "played", name: "Played", type: "default" },
          { id: "wantToPlay", name: "Want to Play", type: "default" },
          { id: "playing", name: "Playing", type: "default" },
        ];

        defaultLists.forEach((list) => {
          const docRef = listsRef.doc(list.id);
          batch.set(docRef, {
            name: list.name,
            type: list.type,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
    };

    initDefaults();

    // 2. جلب القوائم
    const unsubscribe = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists")
      .orderBy("createdAt", "asc")
      .onSnapshot((snapshot) => {
        const loadedLists = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLists(loadedLists);
      });

    return () => unsubscribe();
  }, [user]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await firestore()
        .collection("users")
        .doc(user.uid)
        .collection("lists")
        .add({
          name: newListName,
          type: "custom",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setNewListName("");
      setModalVisible(false);
    } catch (error) {
      Alert.alert(t("common.error"), t("userLists.errors.couldNotCreateList"));
    }
  };

  const handleDeleteList = (listId, listName) => {
    Alert.alert(
      t("userLists.actions.confirmDeleteTitle"),
      `Delete "${listName}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            // حذف القائمة (يجب حذف الـ Subcollection يدوياً أو عبر Cloud Function، هنا سنحذف الوثيقة فقط للتبسيط)
            await firestore()
              .collection("users")
              .doc(user.uid)
              .collection("lists")
              .doc(listId)
              .delete();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ padding: 10 }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() =>
              navigation.navigate("UserGamesScreen", {
                listId: item.id,
                listName: item.name,
              })
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={item.type === "default" ? "list" : "folder-open-outline"}
                size={24}
                color={COLORS.lightGray}
              />
              <Text style={styles.listName}>{getDisplayName(item.name)}</Text>
            </View>
            {item.type === "custom" && (
              <TouchableOpacity
                onPress={() => handleDeleteList(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("userLists.actions.createNewList")}
            </Text>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder={t("userLists.placeholders.newListName")}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.textBtn}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateList}
                style={styles.createBtn}
              >
                <Text style={styles.textBtn}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.textLight },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  listName: { color: COLORS.textLight, fontSize: 18, marginLeft: 10 },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary + "80",
  },
  modalTitle: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.button,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    color: COLORS.textLight,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-around" },
  cancelBtn: { padding: 10, fontWeight: "bold" },
  createBtn: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
    fontWeight: "semi-bold",
  },
  textBtn: {
    color: COLORS.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
});
