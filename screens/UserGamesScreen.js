import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
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
      <Image source={coverUrl} style={styles.gameImage} />
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
  const { collection } = route.params;
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;
  const mountedRef = useRef(true);
  const { t } = useTranslation();
  useEffect(() => {
    mountedRef.current = true;
    if (!currentUser) {
      setLoading(false);
      // يمكنك عرض رسالة للمستخدم بأنه يجب تسجيل الدخول
      return;
    }

    const collectionRef = firestore()
      .collection("users")
      .doc(currentUser.uid)
      .collection(collection);

    const unsubscribe = collectionRef.onSnapshot(
      (querySnapshot) => {
        if (!mountedRef.current) return;

        const gamesList = [];
        querySnapshot.forEach((doc) => {
          gamesList.push({ ...doc.data(), id: doc.id });
        });
        setGames(gamesList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching want list: ", error);
        if (mountedRef.current) {
          setLoading(false);
        }
        Alert.alert(
          "Error",
          "An error occurred while loading the list, try again later."
        );
      }
    );
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [currentUser]);

  const handleRemoveGame = (gameId, gameName) => {
    if (!currentUser) return;

    Alert.alert(
      `${t("userLists.actions.confirmDeleteTitle")}`,
      `${t("userLists.actions.confirmDeleteMessage")}`,
      [
        { text: "cancel", style: "cancel" },
        {
          text: "remove",
          style: "destructive",
          onPress: async () => {
            const gameIdStr = String(gameId);
            const gameRef = firestore()
              .collection("users")
              .doc(currentUser.uid)
              .collection(collection)
              .doc(gameIdStr);

            try {
              await gameRef.delete();
            } catch (error) {
              console.error("Error removing game: ", error);
              Alert.alert(
                "Error",
                "An error occurred while removing the game, try again later."
              );
            }
          },
        },
      ]
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={80} color={COLORS.primary} />
      <Text style={styles.emptyText}>{t("settings.userGames.emptyText")}</Text>
      <Text style={styles.emptySubText}>
        {t("settings.userGames.emptySubText")}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("GamesScreen")}
        style={styles.findGameButton}
      >
        <Text style={styles.findGameText}>
          {t("settings.userGames.findButton")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#779bdd"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <GameItem game={item} onRemove={handleRemoveGame} />
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
    marginBottom: 12,
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
});

export default UserGamesScreen;
