import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firestore from '@react-native-firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';
import Loading from "../Loading";
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'RSS_FEEDS_CACHE';
const DropdownPicker = (props) => {
  const [rssFeeds, setRssFeeds] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. دالة لتحميل الكاش فوراً عند الفتح
    const loadFromCache = async () => {
      try {
        const cachedString = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedString && isMounted) {
          console.log("📦 Showing Cached Data immediately");
          const cachedData = JSON.parse(cachedString);
          setRssFeeds(cachedData);
          setLoading(false); // نخفي اللودينج لأن البيانات ظهرت
        }
      } catch (error) {
        console.error("Cache loading error:", error);
      }
    };

    loadFromCache();

    // 2. الاستماع للتغييرات في Firestore (Real-time)
    const subscriber = firestore()
      .collection('rss')
      .onSnapshot(
        (snapshot) => {
          let feeds = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            feeds = { ...feeds, ...data };
          });

          if (isMounted) {
            // لو حصل تغيير في الداتا، الكود ده هيشتغل ويحدث الواجهة
            console.log("🔥 Firestore update received - Syncing...");
            setRssFeeds(feeds);
            setLoading(false);

            // وحفظ النسخة الجديدة في الكاش للمرة الجاية
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feeds));
          }
        },
        (error) => {
          console.error("🚨 Error fetching Firestore:", error);
          if (isMounted) setLoading(false);
        }
      );

    return () => {
      isMounted = false;
      subscriber(); // إيقاف الاستماع عند الخروج
    };
  }, []);

  const category = props.category.toLowerCase();
  const websites = rssFeeds[category] || [];
  // 2. تحويل مصفوفة المواقع (websites) إلى الشكل الذي تتطلبه RNPickerSelect
  //    يجب أن تكون `items` على شكل: [{ label: 'Site Name', value: 'siteName' }]
  const pickerItems = websites.map(site => ({
    label: site.name,
    value: site.name, // نستخدم الاسم كقيمة فريدة (value)
  }));

  // 3. الدالة التي سيتم استدعاؤها من RNPickerSelect عند التغيير
  //    مهمتها هي إيجاد الكائن (Object) الكامل المطابق للقيمة (value) التي تم اختيارها
  //    وإرساله إلى المكون الأب (Parent) عبر props.onChange
  const handleValueChange = (value) => {
    if (typeof props.onChange === "function") {
      if (!value) {
        // إذا اختار المستخدم الـ placeholder (القيمة null)
        props.onChange(null);
      } else {
        // ابحث عن الكائن الكامل المطابق للاسم (value)
        const fullItem = websites.find(site => site.name === value);
        props.onChange(fullItem || null);
      }
    }
  };

  // 4. العنصر المختار حالياً (الكائن الكامل) يُؤخذ مباشرة من props.value
  const selectedItem = props.value;

  // --- عرض حالات التحميل أو عدم وجود بيانات ---
  if (loading) {
    return <Loading />;
  }

  if (websites.length === 0 && !loading) {
    return <View style={styles.wrapper}><Text style={styles.buttonText}>No sites found for {props.category}</Text></View>;
  }


  return (
    <View style={styles.wrapper}>
      <View style={styles.pickerContainer}>
        {/* نعرض صورة الموقع المختار بجانب الـ Picker */}
        {selectedItem?.image && (
          <Image source={{ uri: selectedItem?.image }} style={styles.avatar} />
        )}

        {/* 6. مكون RNPickerSelect الأساسي */}
        <View style={{ flex: 1 }}>
          <RNPickerSelect
            onValueChange={handleValueChange}
            items={websites.map(site => ({
              label: site.name, value: site.name
            }))}
            value={selectedItem?.name ?? null} // القيمة الحالية هي "اسم" العنصر المختار
            placeholder={{ label: "Select a website...", value: null }}
          />
        </View>
      </View>

      <View style={styles.siteDesc}>
        <Image source={{ uri: selectedItem?.image }} style={styles.siteImg} />
        <View style={styles.siteText}>
          <Text style={styles.siteName}>{selectedItem.name}</Text>
          <Text style={styles.siteAbout}>{selectedItem.aboutSite}</Text>
          {selectedItem.language === "ar" ? <TouchableOpacity onPress={() => Linking.openURL(selectedItem?.website)} style={styles.visitSiteBtn}><Text style={styles.visitSite}>زور الموقع <Ionicons name="arrow-up-right-box-outline" size={18} color="white" /></Text></TouchableOpacity> : <TouchableOpacity onPress={() => Linking.openURL(selectedItem.website)} style={styles.visitSiteBtn}><Text style={styles.visitSite}>Visit Website <Ionicons name="arrow-up-right-box-outline" size={18} color="white" /></Text></TouchableOpacity>}
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
    alignItems: 'center',
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
