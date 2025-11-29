import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  FlatList,
} from "react-native";
import { useState, useEffect, useMemo, memo } from "react";
import { EpicFreeGames } from "epic-free-games";
import Loading from "../Loading";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../constants/colors";

const CACHE_KEY = "EPIC_GAMES_CACHE";

// --- Sub-Component: Countdown Timer (Optimization: Re-renders only itself) ---
const CountdownTimer = memo(({ t }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextThursday());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilNextThursday());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function getTimeUntilNextThursday() {
    const now = new Date();
    const nextThursday = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilThursday = (4 - dayOfWeek + 7) % 7;

    // If today is Thursday and past 5 PM, aim for next week
    if (daysUntilThursday === 0 && now.getHours() >= 17) {
      daysUntilThursday = 7;
    }

    nextThursday.setDate(now.getDate() + daysUntilThursday);
    nextThursday.setHours(17, 0, 0, 0);

    const diff = nextThursday - now;
    return diff > 0 ? diff : 0;
  }

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

// Helper for Timer UI
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

    // 2. Fetch Fresh Data
    try {
      const epicFreeGames = new EpicFreeGames({
        country: "US",
        locale: "en-US",
        includeAll: true,
      });

      const res = await epicFreeGames.getGames();
      setGame(res);
      setLoading(false);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: res, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Error fetching games:", err);
      if (!game) setLoading(false);
    }
  };

  // Combine and flatten data for FlatList
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
    const imageUrl = item.keyImages?.[2]?.url || item.keyImages?.[0]?.url; // Better fallback logic

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => {
          // Use item.urlSlug or offerMappings for safer linking
          const slug = item.offerMappings?.[0]?.pageSlug || item.urlSlug;
          if (slug) {
            Linking.openURL(`https://store.epicgames.com/en-US/p/${slug}`);
          }
        }}
      >
        <View>
          {/* Show Discount Badge if Current */}
          {item.type === "current" && (
            <Text style={styles.discountBadge}>
              {t("games.freeGames.discount")}
            </Text>
          )}

          {/* Show Timer Overlay if Next */}
          {item.type === "next" && <CountdownTimer t={t} />}

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
      {loading && <Loading />}
      <Text style={styles.header}>{t("games.freeGames.header")}</Text>

      <FlatList
        data={flatListData}
        renderItem={renderGameItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

export default FreeGames;
const styles = StyleSheet.create({
  container: {
    // flexDirection: "row"
  },
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
  // Overlay & Timer Styles
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
    borderRadius: 10, // Match cover radius
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
});
