import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  FlatList,
  ScrollView,
} from "react-native";
import { useState, useEffect, useMemo, memo } from "react";
import axios from "axios";
import SkeletonGameCard from "../skeleton/SkeletonGameCard";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../constants/colors";

const CACHE_KEY = "EPIC_GAMES_CACHE";

// --- Sub-Component: Countdown Timer ---
// التعديل: استقبال startDate كـ prop واستخدامه في الحساب
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
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    // 1. Cache First Strategy
    try {
      const cachedString = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedString) {
        const cachedObject = JSON.parse(cachedString);
        setGame(cachedObject.data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Cache loading error:", error);
    }

    // 2. Fetch Fresh Data using Axios
    try {
      const response = await axios.get(
        "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
      );

      const allGames = response.data.data.Catalog.searchStore.elements;

      // Filter Current Free Games
      const currentGames = allGames.filter((game) => {
        const promotions = game.promotions;
        if (!promotions || !promotions.promotionalOffers) return false;
        return promotions.promotionalOffers.length > 0;
      });

      // Filter Upcoming Free Games
      const nextGames = allGames.filter((game) => {
        const promotions = game.promotions;
        if (
          !promotions ||
          !promotions.upcomingPromotionalOffers ||
          promotions.upcomingPromotionalOffers.length === 0
        ) {
          return false;
        }

        const offer =
          promotions.upcomingPromotionalOffers[0].promotionalOffers[0];

        if (!offer || !offer.discountSetting) return false;

        return offer.discountSetting.discountPercentage === 0;
      });

      const processedData = {
        currentGames: currentGames,
        nextGames: nextGames,
      };

      setGame(processedData);
      setLoading(false);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: processedData, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Error fetching games:", err);
      setLoading(false);
    }
  };

  const flatListData = useMemo(() => {
    if (!game) return [];

    const current = (game.currentGames || []).map((g) => ({
      ...g,
      type: "current",
    }));
    const next = (game.nextGames || []).map((g) => ({ ...g, type: "next" }));

    return [...current, ...next];
  }, [game]);

  const renderGameItem = ({ item, index }) => {
    const imageUrl = item.keyImages?.[2]?.url || item.keyImages?.[0]?.url;

    // استخراج تاريخ البدء للألعاب القادمة
    let startDate = null;
    if (item.type === "next") {
      const offer =
        item.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
      if (offer && offer.startDate) {
        startDate = offer.startDate;
      }
    }

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => {
          const slug = item.offerMappings?.[0]?.pageSlug || item.urlSlug;
          if (slug) {
            Linking.openURL(`https://store.epicgames.com/en-US/p/${slug}`);
          }
        }}
      >
        <View>
          {item.type === "current" && (
            <Text style={styles.discountBadge}>
              {t("games.freeGames.discount")}
            </Text>
          )}

          {/* تمرير تاريخ البدء للعداد */}
          {item.type === "next" && startDate && (
            <CountdownTimer t={t} startDate={startDate} />
          )}

          <Image
            source={
              imageUrl
                ? { uri: imageUrl }
                : require("../assets/image-not-found.webp")
            }
            style={styles.cover}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.header}>{t("games.freeGames.header")}</Text>

      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {[1, 2, 3].map((item) => (
            <SkeletonGameCard key={item} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={flatListData}
          renderItem={renderGameItem}
          keyExtractor={(item, index) => item.id || index.toString()}
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
  container: {},
  header: { fontSize: 28, color: "white", margin: 12, fontWeight: "bold" },
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
    borderRadius: 10,
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
    padding: 7,
    top: 0,
    right: 0,
    fontSize: 16,
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
  listContent: {},
});
