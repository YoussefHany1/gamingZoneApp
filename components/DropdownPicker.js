import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import { collection, onSnapshot } from "firebase/firestore";
// import { db } from "../firebase.js";
import firestore from '@react-native-firebase/firestore';

// const docRef = collection(db, "rss");
// let rssFeeds = [];

// onSnapshot(
//   docRef,
//   (snap) => {
//     if (snap) {
//       rssFeeds = [];
//       snap.docs.forEach((doc) => {
//         const data = doc.data();
//         rssFeeds = { ...rssFeeds, ...data };
//       });
//       // console.log("✅ Current data: ", rssFeeds?.hardware);
//     } else {
//       console.log("❌ Document does not exist.");
//     }
//   },
//   (err) => {
//     console.error("🚨 Error while fetching Firestore document:", err);
//   }
// );

const DropdownPicker = (props) => {
  const [rssFeeds, setRssFeeds] = useState({}); // 1. نستخدم State
  const [loading, setLoading] = useState(true);

  useEffect(() => { // 2. نستخدم Effect لجلب البيانات
    const subscriber = firestore()
      .collection('rss')
      .onSnapshot(
        (snapshot) => {
          let feeds = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            feeds = { ...feeds, ...data };
          });
          setRssFeeds(feeds);
          setLoading(false);
        },
        (error) => {
          console.error("🚨 Error fetching Firestore:", error);
          setLoading(false);
        }
      );

    // إلغاء الاشتراك
    return () => subscriber();
  }, []);

  const category = props.category.toLowerCase();
  const websites = rssFeeds[category] || [];

  // init safely (use websites[0] if موجود)
  const [selected, setSelected] = useState(() => {
    // prefer controlled value from parent if provided
    if (props.value) return props.value;
    return websites[0] ?? null;
  });
  const [open, setOpen] = useState(false);

  // important: reset selected if websites (or category) تتغير
  // reset when category changes
  useEffect(() => {
    setSelected(props.value ?? websites[0] ?? null);
  }, [props.category, websites]);

  // keep in sync when parent controls the value
  useEffect(() => {
    if (props.value && props.value?.name !== selected?.name) {
      setSelected(props.value);
    }
  }, [props.value]);

  const renderItem = ({ item }) => {
    const isSelected = selected?.name === item.name;
    return (
      <TouchableOpacity
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={() => {
          // log the item we clicked
          console.log("pressed item:", item.name);
          setSelected(item);
          // call callback (if موجود) قبل اغلاق المودال لو حبيت
          if (typeof props.onChange === "function") {
            props.onChange(item);
          }
          setOpen(false);
        }}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.check,
            isSelected ? styles.checkVisible : styles.checkHidden,
          ]}
        >
          ✓
        </Text>

        <View style={styles.itemRow}>
          <Image source={{ uri: item.image }} style={styles.avatar} />
          <Text numberOfLines={1} style={styles.optionText}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Open picker. Selected: ${selected?.name ?? "none"
          }`}
      >
        <View style={styles.dropdownButton}>
          <Image source={{ uri: selected?.image }} style={styles.avatar} />
          <Text style={styles.buttonText}>{selected?.name}</Text>
        </View>
        <Text style={styles.chev}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* هنا نضع overlay كعنصر منفصل لكي لا يلتقط اللمسات داخل صندوق القائمة */}
        <TouchableOpacity style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.dropdownContainer}>
          <FlatList
            data={websites}
            keyExtractor={(i) => String(i.id)}
            extraData={selected}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
      <View style={styles.siteDesc}>
        <Image source={{ uri: selected?.image }} style={styles.siteImg} />
        <View style={styles.siteText}>
          <Text style={styles.siteName}>{selected.name}</Text>
          <Text style={styles.siteAbout}>{selected.aboutSite}</Text>
          {selected.language === "ar" ? <TouchableOpacity onPress={() => Linking.openURL(selected.website)} style={styles.visitSiteBtn}><Text style={styles.visitSite}>زور الموقع <Ionicons name="arrow-up-right-box-outline" size={18} color="white" /></Text></TouchableOpacity> : <TouchableOpacity onPress={() => Linking.openURL(selected.website)} style={styles.visitSiteBtn}><Text style={styles.visitSite}>Visit Website <Ionicons name="arrow-up-right-box-outline" size={18} color="white" /></Text></TouchableOpacity>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingBottom: 20,
  },
  button: {
    width: 208,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    alignItems: "center",
    color: "#fff",
    fontSize: 14,
    flexShrink: 1,
  },
  chev: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginLeft: 8,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)", // dims background
    // justifyContent: "center", // يضع القائمة في الوسط, غيّر إذا تريد أسفل الزر
    padding: 20,
  },
  dropdownContainer: {
    position: "absolute",
    top: 200,
    width: 208,
    maxHeight: 300,
    alignSelf: "center",
    backgroundColor: "#0b1220", // مكان تشبه bg
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingVertical: 6,
    elevation: 6,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  check: {
    width: 20,
    textAlign: "center",
    marginRight: 6,
    fontSize: 16,
  },
  checkVisible: {
    color: "#fff",
    opacity: 1,
  },
  checkHidden: {
    color: "transparent",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "#ccc",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
    // flexShrink: 1,
  },
  separator: {
    height: 6,
  },
  siteDesc: {
    flexDirection: "row-reverse",
    marginTop: 20
  },
  siteImg: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  siteText: {
    marginHorizontal: 10
  },
  siteName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 28
  },
  siteAbout: {
    color: "white",
    width: 250
  },
  visitSiteBtn: {
    color: "white",
    backgroundColor: "#516996",
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  visitSite: {
    color: "white",
    fontWeight: "bold"
  }
});

export default DropdownPicker;
