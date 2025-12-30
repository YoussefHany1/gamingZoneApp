import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import UserGamesSkeleton from "../skeleton/SkeletonUserGames";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

function GameItem({ game, onRemove }) {
  const navigation = useNavigation();
  const coverUrl = game.cover_image_id
    ? {
        uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${game.cover_image_id}.jpg`,
      }
    : require("../assets/image-not-found.webp");

  return (
    <TouchableOpacity
      style={styles.gameItemContainer}
      onPress={() => navigation.navigate("GameDetails", { gameID: game.id })}
    >
      <Image
        source={coverUrl}
        style={styles.gameImage}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={2}>
          {game.name}
        </Text>
        <Text style={styles.gameReleaseDate}>
          {String(game.release_date || "")}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(game.id, game.name)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF6347" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function UserGamesScreen({ route, navigation }) {
  const { listId, listName } = route.params;
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAds, setShowAds] = useState(false);
  const currentUser = auth().currentUser;
  const mountedRef = useRef(true);
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

  const CACHE_KEY = currentUser
    ? `USER_GAMES_${currentUser.uid}_LIST_${listId}`
    : null;
  // تفعيل الإعلانات بعد تحميل القائمة
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!currentUser) {
      setLoading(false);
      // يمكنك عرض رسالة للمستخدم بأنه يجب تسجيل الدخول
      return;
    }

    let unsubscribe = () => {};

    const init = async () => {
      // 1. تحميل الكاش أولاً (السرعة القصوى)
      try {
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData && mountedRef.current) {
          const parsedGames = JSON.parse(cachedData);
          if (parsedGames && parsedGames.length > 0) {
            setGames(parsedGames);
            setLoading(false); // إخفاء التحميل فوراً لأن البيانات ظهرت
          }
        }
      } catch (e) {
        console.error("Failed to load cache", e);
      }

      // 2. التحقق من الإنترنت
      const netState = await NetInfo.fetch();

      // إذا كنا أوفلاين ولدينا بيانات، نتوقف هنا
      if (!netState.isConnected) {
        if (mountedRef.current) setLoading(false);
        // ملاحظة: Firestore لديه ميزة أوفلاين خاصة به، لكننا نفضل التحكم اليدوي هنا
        // لضمان عدم ظهور دائرة تحميل لا نهائية
      }

      const collectionRef = firestore()
        .collection("users")
        .doc(currentUser.uid)
        .collection("lists") // الدخول لمجموعة القوائم
        .doc(listId) // تحديد القائمة المطلوبة
        .collection("games"); // الدخول للألعاب داخلها

      unsubscribe = collectionRef.onSnapshot(
        (querySnapshot) => {
          if (!mountedRef.current) return;

          const gamesList = [];
          querySnapshot.forEach((doc) => {
            gamesList.push({ ...doc.data(), id: doc.id });
          });
          setGames(gamesList);
          setLoading(false);

          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(gamesList)).catch(
            (e) => console.error(e)
          );
        },
        (error) => {
          console.error("Error fetching want list: ", error);
          if (mountedRef.current) {
            setLoading(false);
          }
          if (games.length === 0) {
            Alert.alert(t("common.error"), t("userGames.messages.loadError"));
          }
        }
      );
    };

    init();

    return () => {
      mountedRef.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, listId, CACHE_KEY]);

  const handleRemoveGame = (gameId, gameName) => {
    if (!currentUser) return;

    Alert.alert(
      `${t("userLists.actions.confirmDeleteTitle")}`,
      `${t("userLists.actions.confirmDeleteMessage", { gameName: gameName })}`,
      [
        { text: "cancel", style: "cancel" },
        {
          text: "remove",
          style: "destructive",
          onPress: async () => {
            const gameIdStr = String(gameId);
            const oldGames = [...games];
            const newGames = games.filter((g) => g.id !== gameIdStr);
            setGames(newGames);
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newGames)).catch(
              console.error
            );
            // delete from firestore
            const gameRef = firestore()
              .collection("users")
              .doc(currentUser.uid)
              .collection("lists")
              .doc(listId)
              .collection("games")
              .doc(gameIdStr);

            try {
              await gameRef.delete();
            } catch (error) {
              console.error("Error removing game: ", error);
              // إعادة الحالة القديمة عند الفشل
              setGames(oldGames);
              AsyncStorage.setItem(CACHE_KEY, JSON.stringify(oldGames)).catch(
                console.error
              );
              Alert.alert(
                t("common.error"),
                t("userGames.messages.removeError")
              );
            }
          },
        },
      ]
    );
  };
  useEffect(() => {
    navigation.setOptions({ title: getDisplayName(listName) });
  }, [listName]);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={80} color={COLORS.primary} />
      <Text style={styles.emptyText}>{t("settings.userGames.emptyText")}</Text>
      <Text style={styles.emptySubText}>
        {t("settings.userGames.emptySubText")}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("Games")}
        style={styles.findGameButton}
      >
        <Text style={styles.findGameText}>
          {t("settings.userGames.findButton")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {loading && games.length === 0 ? (
        <UserGamesSkeleton />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <>
              {/* عرض اللعبة */}
              <GameItem game={item} onRemove={handleRemoveGame} />

              {/* شرط ظهور الإعلان: إذا كان الترتيب يقبل القسمة على 4 */}
              {/* {showAds && // 1. نتحقق أولاً أن الإعلانات مفعلة بشكل عام
                ((index + 1) % 4 === 0 || // 2. إما يظهر كل 4 عناصر
                  (games.length < 4 && index === games.length - 1)) && ( // 3. أو يظهر في نهاية القائمة القصيرة
                  <View style={styles.ad}>
                    <Text style={styles.adText}>{t("common.ad")}</Text>
                    <BannerAd
                      unitId={adUnitId}
                      size={BannerAdSize.MEDIUM_RECTANGLE}
                      requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                      }}
                    />
                  </View>
                )} */}
            </>
          )}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubText: {
    color: "gray",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  findGameButton: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 16,
    marginTop: 28,
  },
  findGameText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  gameItemContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    borderRadius: 12,
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  gameImage: {
    width: 80,
    height: 105,
    borderRadius: 8,
  },
  gameInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gameName: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  gameReleaseDate: {
    color: "gray",
    fontSize: 14,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 55,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
});

export default UserGamesScreen;
