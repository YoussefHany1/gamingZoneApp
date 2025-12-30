import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

const ListSelectionModal = ({ visible, onClose, gameId, gameData }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // هذا الـ Effect يعمل فقط عند فتح المودال (visible يصبح true)
  useEffect(() => {
    // 1. لو المودال مقفول، مانعملش حاجة ونخرج
    if (!visible) return;

    const user = auth().currentUser;
    if (!user) return;

    // 2. أهم خطوة: تصفير القائمة تماماً لضمان عدم ظهور أي اختيارات سابقة
    setLists([]);
    setLoading(true);

    const listsRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists");

    // 3. جلب القوائم
    // استخدمنا get بدل onSnapshot هنا لضمان استقرار البيانات عند الفتح
    listsRef.get().then(async (snapshot) => {
      // أ: تحويل البيانات لقائمة مبدئية (كلها غير مختارة)
      const initialLists = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        isChecked: false, // إجباري: ابدأ دايماً بغير مختار
      }));

      // عرض القائمة المبدئية فوراً (هتظهر مربعات فاضية)
      setLists(initialLists);
      setLoading(false);

      if (!gameId) return;

      // ب: التحقق من قاعدة البيانات في الخلفية
      try {
        const checkedLists = await Promise.all(
          initialLists.map(async (list) => {
            const gameDoc = await listsRef
              .doc(list.id)
              .collection("games")
              .doc(String(gameId))
              .get();
            return {
              ...list,
              isChecked: gameDoc.exists(),
            };
          })
        );

        // تحديث القائمة بالقيم الحقيقية
        setLists(checkedLists);
      } catch (error) {
        console.error("Error checking games:", error);
      }
    });

    // دالة التنظيف (اختيارية هنا لأننا استخدمنا get)
    return () => {};
  }, [visible, gameId]); // يعيد العمل كل ما المودال يفتح

  const toggleList = async (listId) => {
    const user = auth().currentUser;
    if (!user) return;

    // العثور على القائمة المستهدفة لتحديد حالتها الجديدة
    const targetListIndex = lists.findIndex((l) => l.id === listId);
    if (targetListIndex === -1) return;

    const currentStatus = lists[targetListIndex].isChecked;
    const newStatus = !currentStatus;

    // 1. تحديث الواجهة فوراً (Optimistic Update)
    const updatedLists = [...lists];
    updatedLists[targetListIndex].isChecked = newStatus;
    setLists(updatedLists);

    const gameRef = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("lists")
      .doc(listId)
      .collection("games")
      .doc(String(gameId));

    try {
      if (newStatus) {
        // المستخدم يريد الإضافة (لأن الحالة الجديدة true)
        if (gameData) {
          await gameRef.set(gameData);
        }
      } else {
        // المستخدم يريد الحذف (لأن الحالة الجديدة false)
        await gameRef.delete();
      }
    } catch (error) {
      console.error("Error toggling list:", error);
      // في حالة الخطأ، نعيد الواجهة كما كانت
      const revertLists = [...lists];
      revertLists[targetListIndex].isChecked = currentStatus;
      setLists(revertLists);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {t("games.details.listStatus.add") || "Add to..."}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.secondary} />
          ) : (
            <FlatList
              data={lists}
              keyExtractor={(item) => item.id}
              extraData={lists} // تأكيد للتحديث
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    item.isChecked && styles.selectedOption,
                  ]}
                  onPress={() => toggleList(item.id)}
                >
                  <Ionicons
                    // "checkbox" أيقونة مليانة، "square-outline" أيقونة فاضية
                    name={item.isChecked ? "checkbox" : "square-outline"}
                    size={24}
                    color={COLORS.secondary}
                  />
                  <Text
                    style={[
                      styles.listName,
                      item.isChecked && { fontWeight: "bold" },
                    ]}
                  >
                    {getDisplayName(item.name)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    color: "#ccc",
                    textAlign: "center",
                    marginVertical: 10,
                  }}
                >
                  No lists found.
                </Text>
              }
            />
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    width: "80%",
    borderRadius: 12,
    paddingVertical: 20,
    maxHeight: "60%",
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + "70",
  },
  listName: {
    color: "white",
    fontSize: 18,
    marginLeft: 12,
  },
  closeButton: {
    textAlign: "center",
    alignItems: "center",
    paddingTop: 15,
  },
  closeButtonText: {
    color: "#779bdd",
    fontSize: 18,
    fontWeight: "bold",
  },
  selectedOption: {
    backgroundColor: COLORS.secondary + "33",
  },
});

export default ListSelectionModal;
