import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import COLORS from "../constants/colors";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import NotificationService from "../notificationService";
import { memo } from "react";
import SkeletonDropdown from "../skeleton/SkeletonDropdown";

const DropdownPicker = (props) => {
  const { preferences, toggleSource } = useNotificationPreferences();

  const category = props.category.toLowerCase();
  const websites = props.websites || [];

  const pickerItems = websites.map((site) => ({
    label: site.name,
    value: site.name,
  }));

  const handleValueChange = (value) => {
    if (typeof props.onChange === "function") {
      if (!value) {
        props.onChange(null);
      } else {
        const fullItem = websites.find((site) => site.name === value);
        props.onChange(fullItem || null);
      }
    }
  };

  const selectedItem = props.value;

  const notifTopic = selectedItem
    ? NotificationService.getTopicName(category, selectedItem.name)
    : null;
  const isNotifEnabled = notifTopic ? preferences[notifTopic] : false;

  if (websites.length === 0) {
    return <SkeletonDropdown />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.pickerContainer}>
        {selectedItem?.image && (
          <Image source={{ uri: selectedItem?.image }} style={styles.avatar} />
        )}

        <View style={{ flex: 1 }}>
          <RNPickerSelect
            onValueChange={handleValueChange}
            items={pickerItems}
            value={selectedItem?.name ?? null}
            placeholder={{ label: "Select a website...", value: null }}
          />
        </View>
      </View>

      <View style={styles.siteDesc}>
        <Image source={{ uri: selectedItem?.image }} style={styles.siteImg} />
        <View style={styles.siteText}>
          <Text style={styles.siteName}>{selectedItem.name}</Text>
          <Text style={styles.siteAbout}>{selectedItem.aboutSite}</Text>
          <View style={styles.buttons}>
            {selectedItem.language === "ar" ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(selectedItem?.website)}
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
                onPress={() => Linking.openURL(selectedItem.website)}
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
              style={styles.switchContainer}
              onPress={() => toggleSource(category, selectedItem.name)}
            >
              <Ionicons
                name={
                  isNotifEnabled ? "notifications" : "notifications-off-outline"
                }
                size={24}
                color={isNotifEnabled ? "#779bdd" : "#666"}
                style={{ marginRight: 5 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  buttonText: {
    alignItems: "center",
    color: "#fff",
    fontSize: 14,
    flexShrink: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "#ccc",
  },
  siteDesc: {
    flexDirection: "row-reverse",
    marginTop: 20,
  },
  siteImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
});

export default memo(DropdownPicker);
