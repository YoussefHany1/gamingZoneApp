import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import SkeletonGameCard from "../skeleton/SkeletonGameCard";
import COLORS from "../constants/colors";
import { SERVER_URL } from "../constants/config";

const fetchGames = async ({ queryKey }) => {
  const [_, endpoint, query] = queryKey;

  // تحديد المسار الأساسي بناءً على الشرط
  const url = endpoint ? `${SERVER_URL}${endpoint}` : `${SERVER_URL}/search`;

  // إرسال الطلب
  const response = await axios.get(url, {
    // ميزة Axios الكبرى هنا: تمرير الباراميترز كـ Object
    params: query ? { q: query } : {},
  });

  return response.data;
};

function formatPath(text) {
  return text
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .flatMap((part) => part.split("-"))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// for rating background
function getRatingColor(rating) {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}

const generateCacheKey = (type, value) => `games_cache:${type}:${value}`;

export default function GamesList({ endpoint, query, header }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const {
    data: games,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["games", endpoint, query],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 5, // كاش لمدة 5 دقائق
    cacheTime: 1000 * 60 * 30, // الاحتفاظ في الذاكرة 30 دقيقة
  });
  // 4. fetch data from localhost
  const fetchGamesFromServer = useCallback(
    async (ep) => {
      setLoading(true);
      setGames([]); // تفريغ القائمة مؤقتاً عند تغيير التصنيف
      setError(null);
      const cacheKey = generateCacheKey("server", ep);
      let cacheFound = false;

      // 4.1. محاولة عرض الكاش فوراً
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          console.log(`📦 Showing Cached Data immediately for endpoint: ${ep}`);
          setGames(parsedData.data);
          setLoading(false); // إظهار المحتوى للمستخدم
          cacheFound = true;
        }
      } catch (e) {
        console.error("Error reading cache:", e);
      }

      // 4.2. جلب البيانات الجديدة من الخادم في الخلفية (Sync)
      const url = `${SERVER_URL}${ep}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          // محاولة قراءة رسالة الخطأ من السيرفر إن وجدت
          const errorText = await res.text().catch(() => "");
          throw new Error(`Server returned status: ${res.status} ${errorText}`);
        }
        const data = await res.json();

        // console.log(`🔥 Server update received for endpoint: ${ep} - Syncing UI...`);
        setGames(data); // تحديث الواجهة بالبيانات الجديدة
        setLoading(false);

        // 4.3. تخزين البيانات الجديدة في الكاش
        const cacheData = { data: data, timestamp: Date.now() };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        console.error("Network request failed:", e);
        // إذا لم نجد كاش في البداية، وفشلت الشبكة أيضاً، نعرض خطأ
        if (!cacheFound) {
          setError(`${t("games.list.serverError")}`);
        } else {
          console.log("Keeping cached data displayed despite network error.");
        }
        setLoading(false);
      }
    },
    [t]
  );

  // 5. ftech data from IGDB for serach
  const fetchGamesFromIGDB = useCallback(
    async (q) => {
      setLoading(true);
      setGames([]);
      setError(null);
      const cacheKey = generateCacheKey("search", q);
      let cacheFound = false;

      try {
        const response = await axios.get(`${SERVER_URL}/search`, {
          params: { q: q },
        });
        const json = response.data;
        setGames(json);
        setLoading(false);

        const cacheData = { data: json, timestamp: Date.now() };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (err) {
        console.error("Error fetching search results:", err);

        const errorMessage = err.response?.status
          ? `Server Error: ${err.response.status}`
          : err.message || `${t("games.list.serverError")}`;

        if (!cacheFound) {
          setError(errorMessage);
        }
        setLoading(false);
      }
    },
    [t]
  );

  // useEffect decides which function to call
  useEffect(() => {
    if (endpoint) {
      // If 'endpoint' exists, call the server
      fetchGamesFromServer(endpoint);
    } else if (query) {
      // If 'query' exists, call IGDB
      fetchGamesFromIGDB(query);
    } else {
      // If neither of them is present, do nothing
      setGames([]);
      setLoading(false);
      setError(null);
    }
  }, [endpoint, query, fetchGamesFromServer, fetchGamesFromIGDB]);

  // game type
  const GAME_TYPE_LABELS = {
    1: "DLC",
    2: "Expansion",
    5: "MOD",
    6: "Episode",
    7: "Season",
    8: "Remake",
    9: "Remaster",
    10: "Expanded",
  };
  // console.log(games)
  const renderGame = ({ item }) => {
    const label = GAME_TYPE_LABELS[item.game_type];
    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate("GameDetails", { gameID: item.id })}
      >
        <Image
          source={
            item.cover
              ? {
                  uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg`,
                }
              : require("../assets/image-not-found.webp")
          }
          style={styles.cover}
        />
        {label && <Text style={styles.gameType}>{label}</Text>}
        {item.total_rating != null && (
          <Text
            style={[
              styles.rating,
              { backgroundColor: getRatingColor(item.total_rating / 10) },
            ]}
          >
            {Math.round(item.total_rating) / 10}
          </Text>
        )}

        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };
  const skeletons = Array.from({ length: 5 }).map((_, index) => ({
    id: index,
  }));
  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.container}>
          <FlatList
            data={skeletons}
            horizontal={!!endpoint} // نفس منطق العرض (أفقي أو عمودي)
            numColumns={query ? 2 : 1}
            key={query ? "skeleton-grid" : "skeleton-list"}
            renderItem={() => <SkeletonGameCard />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: 12,
              paddingHorizontal: 5,
              // محاكاة نفس الـ styling للقائمة الأصلية
              ...(query && { alignItems: "center", paddingBottom: 320 }),
            }}
          />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && games.length === 0 && (query || endpoint) && (
        <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
      )}

      {!isLoading && !error && games.length > 0 && (
        <>
          <Text style={styles.header}>{header}</Text>
          <FlatList
            data={games}
            horizontal={!!endpoint}
            numColumns={query ? 2 : 1}
            key={query ? "grid" : "list"}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderGame}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: 12,
              paddingHorizontal: 5,
              ...(query && { alignItems: "center", paddingBottom: 320 }),
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
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
  gameType: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "white",
    fontWeight: "600",
    top: 0,
    left: 0,
    padding: 5,
    margin: 12,
    borderRadius: 12,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
    width: 150,
  },
  rating: {
    color: "white",
    position: "absolute",
    textAlign: "center",
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    textAlignVertical: "center",
    width: 50,
    height: 50,
    top: 0,
    right: 0,
    fontSize: 20,
    fontWeight: "bold",
  },
  error: {
    color: "#ffcccc",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  noResults: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
});
