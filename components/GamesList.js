import React, { useCallback, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import SkeletonGameCard from "../skeleton/SkeletonGameCard";
import COLORS from "../constants/colors";
import { SERVER_URL } from "../constants/config";

// --- ثوابت القياسات لحساب getItemLayout ---
// يجب أن تتطابق هذه الأرقام مع الـ Styles بالأسفل
const CARD_HEIGHT = 290; // الارتفاع الكلي للكارد (مع المارجن)
const CARD_WIDTH = 180; // العرض الكلي للكارد (مع المارجن)

// --- دوال مساعدة ---
const fetchGames = async ({ queryKey }) => {
  const [_, endpoint, query] = queryKey;
  const url = endpoint ? `${SERVER_URL}${endpoint}` : `${SERVER_URL}/search`;
  const params = query ? { q: query } : {};
  const response = await axios.get(url, { params });
  return response.data;
};

function getRatingColor(rating) {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}

// --- 2. المكون المنفصل والمحسن (Memoized Component) ---
const GameCard = React.memo(({ item }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const labelKey = `games.list.gameTypes.${item.game_type}`;
  const label = t(labelKey);

  const validTypes = [1, 2, 5, 6, 7, 8, 9, 10];
  const shouldShowLabel = validTypes.includes(item.game_type);

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: item.id });
  }, [navigation, item.id]);

  return (
    <TouchableOpacity style={styles.gameCard} onPress={handlePress}>
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
      {shouldShowLabel && <Text style={styles.gameType}>{label}</Text>}
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
});

export default function GamesList({ endpoint, query, header }) {
  const { t } = useTranslation();

  const {
    data: games = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["games", endpoint, query],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!endpoint || !!query,
    retry: 2,
  });

  const skeletons = Array.from({ length: 6 }).map((_, index) => ({
    id: index,
  }));

  const errorMessage = error
    ? error.response?.data?.message ||
      error.message ||
      t("games.list.serverError")
    : null;

  // دالة Render Item تستدعي المكون المحسن
  const renderItem = useCallback(({ item }) => <GameCard item={item} />, []);

  // --- 1. تطبيق getItemLayout ---
  // نقوم بحساب الأبعاد بناء على هل القائمة أفقية أم شبكة عمودية
  const getItemLayout = useCallback(
    (data, index) => {
      const isHorizontal = !!endpoint;
      const numColumns = query ? 2 : 1;

      if (isHorizontal) {
        // في الحالة الأفقية نحسب بالعرض
        return {
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        };
      } else {
        // في حالة الشبكة (Grid) أو القائمة العمودية
        // ملاحظة: مع numColumns > 1، الحسبة تصبح معقدة قليلاً لأن الـ offset يخص الصف
        // المعادلة: الارتفاع * (رقم الصف)
        return {
          length: CARD_HEIGHT,
          offset: CARD_HEIGHT * Math.floor(index / numColumns),
          index,
        };
      }
    },
    [endpoint, query]
  );

  return (
    <View style={styles.container}>
      {isLoading && (
        <FlatList
          data={skeletons}
          horizontal={!!endpoint}
          numColumns={query ? 2 : 1}
          key={query ? "skeleton-grid" : "skeleton-list"}
          renderItem={() => <SkeletonGameCard />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 5,
            ...(query && { alignItems: "center", paddingBottom: 320 }),
          }}
        />
      )}

      {error && <Text style={styles.error}>{errorMessage}</Text>}

      {!isLoading && !error && games.length === 0 && (query || endpoint) && (
        <Text style={styles.noResults}>{t("games.list.noResults")}</Text>
      )}

      {!isLoading && !error && games.length > 0 && (
        <>
          {header && <Text style={styles.header}>{header}</Text>}
          <FlatList
            data={games}
            horizontal={!!endpoint}
            numColumns={query ? 2 : 1}
            key={query ? "grid" : "list"}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem} // استخدام الدالة المحسنة
            getItemLayout={getItemLayout} // تفعيل خاصية حساب الأبعاد
            initialNumToRender={6} // تحسين إضافي: عدد العناصر المبدئية
            maxToRenderPerBatch={6} // تحسين إضافي: عدد العناصر في كل دفعة
            windowSize={5} // تحسين إضافي: تقليل مساحة الذاكرة للعناصر خارج الشاشة
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              {
                ...(query && { alignItems: "center", paddingBottom: 220 }),
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: { fontSize: 28, color: "white", margin: 12, fontWeight: "bold" },
  gameCard: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 16,
    padding: 10,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 270, // 270 height + 20 margin (top/bottom) = 290 Total
    width: 160, // 160 width + 20 margin (left/right) = 180 Total
  },
  cover: {
    width: 140,
    height: 190,
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
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    width: "100%",
    height: 40,
  },
  rating: {
    color: "white",
    position: "absolute",
    textAlign: "center",
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    textAlignVertical: "center",
    width: 45,
    height: 45,
    top: 0,
    right: 0,
    fontSize: 18,
    fontWeight: "bold",
  },
  error: {
    color: "#ffcccc",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  noResults: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
});
