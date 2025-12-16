import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  SectionList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import NotificationService from "../notificationService";
import { useState, memo, useMemo } from "react";
import SkeletonDropdown from "../skeleton/SkeletonDropdown";
import { useTranslation } from "react-i18next";

const DropdownPicker = (props) => {
  const { t, i18n } = useTranslation();
  const { preferences, toggleSource } = useNotificationPreferences();
  const [modalVisible, setModalVisible] = useState(false);

  const category = props.category.toLowerCase();
  const websites = props.websites || [];
  const selectedItem = props.value;

  const sections = useMemo(() => {
    const arabicSites = websites.filter((item) => item.language === "ar");
    const englishSites = websites.filter((item) => item.language === "en");

    const result = [];

    // نجهز كائنات الأقسام
    const arSection = {
      title: t("news.dropdown.arabicSources"),
      data: arabicSites,
    };
    const enSection = {
      title: t("news.dropdown.englishSources"),
      data: englishSites,
    };

    // التحقق من لغة التطبيق الحالية
    const isEnglishApp = i18n.language.startsWith("en");

    if (isEnglishApp) {
      // لو التطبيق إنجليزي: اعرض الإنجليزي الأول
      if (englishSites.length > 0) result.push(enSection);
      if (arabicSites.length > 0) result.push(arSection);
    } else {
      // لو التطبيق عربي (أو أي لغة تانية): اعرض العربي الأول
      if (arabicSites.length > 0) result.push(arSection);
      if (englishSites.length > 0) result.push(enSection);
    }

    return result;
  }, [websites, i18n.language]);

  if (websites.length === 0 || !selectedItem) {
    return <SkeletonDropdown />;
  }

  const handleSelect = (item) => {
    if (typeof props.onChange === "function") {
      props.onChange(item);
    }
    setModalVisible(false);
  };

  const notifTopic = NotificationService.getTopicName(
    category,
    selectedItem.name
  );
  const isNotifEnabled = notifTopic ? preferences[notifTopic] : false;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.pickerButton}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        {selectedItem?.image ? (
          <Image
            source={selectedItem?.image}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}

        <Text style={styles.pickerButtonText} numberOfLines={1}>
          {selectedItem?.name || "Select a website..."}
        </Text>

        <Ionicons name="chevron-down" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.siteDesc}>
        {selectedItem?.image ? (
          <Image
            source={selectedItem?.image}
            style={styles.siteImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={[styles.siteImg, { backgroundColor: COLORS.secondary }]}
          />
        )}
        <View style={styles.siteText}>
          <Text style={styles.siteName}>{selectedItem?.name || ""}</Text>
          <Text style={styles.siteAbout}>{selectedItem?.aboutSite || ""}</Text>
          <View style={styles.buttons}>
            {/* change language based on site language */}
            {selectedItem?.language === "ar" ? (
              <TouchableOpacity
                onPress={() =>
                  selectedItem?.website &&
                  Linking.openURL(selectedItem?.website).catch(() => {})
                }
                style={styles.visitSiteBtn}
              >
                <Text style={styles.visitSiteText}>
                  زور الموقع{" "}
                  <Ionicons
                    name="arrow-up-right-box-outline"
                    size={18}
                    color="white"
                  />
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  selectedItem?.website &&
                  Linking.openURL(selectedItem.website).catch(() => {})
                }
                style={styles.visitSiteBtn}
              >
                <Text style={styles.visitSiteText}>
                  Visit Website{" "}
                  <Ionicons
                    name="arrow-up-right-box-outline"
                    size={18}
                    color="white"
                  />
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => toggleSource(category, selectedItem?.name)}
              style={styles.bellButton}
            >
              <Ionicons
                name={
                  isNotifEnabled ? "notifications" : "notifications-off-outline"
                }
                size={24}
                color={isNotifEnabled ? "#779bdd" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("news.dropdown.selectSource")}
            </Text>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.name}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedItem?.name === item.name &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={{ alignItems: "center", flexDirection: "row" }}>
                    <Image
                      source={item?.image}
                      style={styles.modalItemLogo}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedItem?.name === item.name && {
                          // color: COLORS.secondary,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {selectedItem?.name === item.name && (
                    <Ionicons
                      name="checkmark-sharp"
                      size={24}
                      color={COLORS.secondary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>
                {t("news.dropdown.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.button,
    borderWidth: 1,
    borderColor: "#779bdd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    width: "60%",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
    marginHorizontal: 10,
    textAlign: "center",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  siteDesc: {
    flexDirection: "row-reverse",
    marginTop: 20,
    alignItems: "center",
  },
  siteImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
  },
  siteText: {
    marginHorizontal: 10,
  },
  siteName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 28,
  },
  siteAbout: {
    color: "white",
    width: 250,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  visitSiteBtn: {
    color: "white",
    backgroundColor: COLORS.secondary,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 24,
  },
  visitSiteText: {
    color: "white",
    fontWeight: "bold",
  },
  bellButton: {
    padding: 8,
    backgroundColor: COLORS.secondary + "50",
    borderRadius: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "60%",
    backgroundColor: COLORS.darkBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    padding: 10,
    borderBottomColor: "#333",
  },
  modalItemSelected: {
    backgroundColor: COLORS.secondary + "50",
    borderBottomColor: "transparent",
    borderRadius: 8,
  },
  modalItemLogo: {
    width: 25,
    height: 25,
    borderRadius: 50,
    marginRight: 10,
    backgroundColor: COLORS.secondary,
  },
  modalItemText: {
    color: "white",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 15,
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  sectionHeader: {
    backgroundColor: COLORS.darkBackground,
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  sectionHeaderText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});

export default memo(DropdownPicker);
