import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  FlatList,
  ScrollView,
  Alert,
} from "react-native";
import { useState, useEffect, useMemo, memo } from "react";
import SkeletonGameCard from "../skeleton/SkeletonGameCard";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import NotificationService from "../notificationService";
import analytics from "@react-native-firebase/analytics";

import { databases } from "../lib/appwrite";
import { Query } from "react-native-appwrite";
import Constants from "expo-constants";

const FREE_GAMES_COLLECTION_ID = "free_games";
// ثوابت الإشعارات الجديدة لتتوافق مع NotificationService
const NOTIF_CATEGORY = "free_games";
const NOTIF_SOURCE = "alerts";

// --- Sub-Component: Countdown Timer (بدون تغيير) ---
const CountdownTimer = memo(({ t, startDate }) => {
  const calculateTimeLeft = () => {
    const now = new Date();
    const targetDate = new Date(startDate);
    const diff = targetDate - now;
    return diff > 0 ? diff : 0;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.overlay}>
      <Text style={styles.subCount}>{t("games.freeGames.freeOn")}</Text>
      <View style={styles.timerContainer}>
        <TimeUnit value={days} label={t("games.freeGames.days")} />
        <TimeUnit value={hours} label={t("games.freeGames.hours")} />
        <TimeUnit value={minutes} label={t("games.freeGames.minutes")} />
        <TimeUnit value={seconds} label={t("games.freeGames.seconds")} />
      </View>
    </View>
  );
});

const TimeUnit = ({ value, label }) => (
  <View>
    <Text style={styles.countdownLabel}>{label}</Text>
    <Text style={styles.countdownNum}>{value}</Text>
  </View>
);

// --- Main Component ---
function FreeGames() {
  const { t } = useTranslation();
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const dbId = Constants.expoConfig.extra.APPWRITE_DATABASE_ID;
  const userId = auth().currentUser?.uid; // الحصول على معرف المستخدم

  useEffect(() => {
    loadGames();
    checkNotificationStatus();
  }, [userId]); // إعادة التحقق عند تغيير المستخدم

  // 1. تحميل حالة الإشعارات من Firestore عبر الخدمة
  const checkNotificationStatus = async () => {
    if (!userId) return;
    try {
      // جلب تفضيلات المستخدم من Firestore
      const prefs = await NotificationService.getUserPreferences(userId);
      // اسم الموضوع المتوقع: free_games_alerts
      const topicName = NotificationService.getTopicName(
        NOTIF_CATEGORY,
        NOTIF_SOURCE
      );

      // التحقق مما إذا كان مفعلاً
      if (prefs[topicName] === true) {
        setNotifEnabled(true);
      } else {
        setNotifEnabled(false);
      }
    } catch (e) {
      console.log("Error reading pref from Firestore", e);
    }
  };

  // 2. زر تبديل التفعيل باستخدام NotificationService
  const toggleNotifications = async () => {
    if (!userId) {
      Alert.alert(t("error"), t("common.loginRequired")); // تأكد من وجود ترجمة مناسبة
      return;
    }

    const newStatus = !notifEnabled;

    // تحديث الواجهة فوراً (Optimistic Update)
    setNotifEnabled(newStatus);

    try {
      // استدعاء الخدمة الموحدة للتعامل مع FCM و Firestore
      await NotificationService.toggleNotificationPreference(
        userId,
        NOTIF_CATEGORY,
        NOTIF_SOURCE,
        newStatus
      );

      if (newStatus) {
        Alert.alert(t("notifications"), t("games.freeGames.subscribed"));
      } else {
        Alert.alert(t("notifications"), t("games.freeGames.unsubscribed"));
      }
    } catch (error) {
      console.error("Toggle error:", error);
      setNotifEnabled(!newStatus); // التراجع في حالة الخطأ
      Alert.alert(t("error"), "Failed to update subscription");
    }
  };

  const loadGames = async () => {
    // 1. Cache First Strategy
    try {
      const cachedString = await AsyncStorage.getItem(
        "FREE_GAMES_APPWRITE_CACHE"
      );
      if (cachedString) {
        const cachedObject = JSON.parse(cachedString);
        setGamesList(cachedObject.data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Cache loading error:", error);
    }

    // 2. Fetch Fresh Data from Appwrite
    try {
      const response = await databases.listDocuments(
        dbId,
        FREE_GAMES_COLLECTION_ID,
        [Query.orderAsc("type"), Query.limit(20)]
      );

      const fetchedGames = response.documents.map((doc) => ({
        id: doc.$id,
        title: doc.title,
        image: doc.image,
        slug: doc.slug,
        description: doc.description,
        type: doc.type,
        startDate: doc.startDate,
        endDate: doc.endDate,
      }));

      setGamesList(fetchedGames);
      setLoading(false);

      await AsyncStorage.setItem(
        "FREE_GAMES_APPWRITE_CACHE",
        JSON.stringify({ data: fetchedGames, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Error fetching games from Appwrite:", err);
      if (loading) setLoading(false);
    }
  };

  const renderGameItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={async () => {
          try {
            await analytics().logEvent("click_free_game", {
              item_id: item.id,
              item_name: item.title,
              content_type: "free_game_card",
              game_type: item.type,
            });
          } catch (error) {
            console.log("Analytics Error:", error);
          }
          if (item.slug) {
            Linking.openURL(`https://store.epicgames.com/en-US/p/${item.slug}`);
          }
        }}
      >
        <View>
          {item.type === "next" && item.startDate && (
            <CountdownTimer t={t} startDate={item.startDate} />
          )}

          <Image
            source={
              item.image
                ? { uri: item.image }
                : require("../assets/image-not-found.webp")
            }
            style={styles.cover}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.type === "current" && (
          <Text style={styles.discountBadge}>
            {t("games.freeGames.discount")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header Container with Button */}
      <View style={{}}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>{t("games.freeGames.header")}</Text>

          <TouchableOpacity
            onPress={toggleNotifications}
            style={styles.bellButton}
          >
            <Ionicons
              name={
                notifEnabled ? "notifications" : "notifications-off-outline"
              }
              size={24}
              color={notifEnabled ? "#779bdd" : "#666"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading && gamesList.length === 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((item) => (
            <SkeletonGameCard key={item} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={gamesList}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

export default FreeGames;

const styles = StyleSheet.create({
  mainContainer: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  header: {
    fontSize: 28,
    color: "white",
    margin: 12,
    fontWeight: "bold",
    width: "80%",
  },
  bellButton: {
    padding: 8,
    backgroundColor: COLORS.secondary + "50",
    borderRadius: 20,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 10,
    borderRadius: 16,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    width: 150,
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    width: 150,
  },
  discountBadge: {
    zIndex: 100,
    color: "white",
    backgroundColor: COLORS.secondary,
    position: "absolute",
    textAlign: "center",
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 5,
    top: 0,
    right: 0,
    fontSize: 15,
    fontWeight: "bold",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  subCount: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 5,
  },
  countdownNum: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  countdownLabel: {
    color: "#ccc",
    textAlign: "center",
    fontSize: 10,
    marginBottom: 2,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
});
