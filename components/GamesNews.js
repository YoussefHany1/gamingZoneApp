import React, { useCallback } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  View,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

// 1. فصل البيانات في مصفوفة ثابتة (يمكن نقلها لملف منفصل لاحقاً)
const GAMES_DATA = [
  {
    id: "1",
    name: "League of Legends",
    image:
      "https://newzoo.com/wp-content/uploads/api/games/artworks/game--league-of-legends.jpg",
    apiUrl: "https://games-news-api.vercel.app/lol/",
  },
  {
    id: "2",
    name: "Valorant",
    image:
      "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/f657721a7eb06acae52a29ad3a951f20c1e5fc60-1920x1080.jpg",
    apiUrl: "https://games-news-api.vercel.app/valorant/",
  },
  {
    id: "3",
    name: "Fortnite",
    image: "https://howlongtobeat.com/games/3657_Fortnite.jpg",
    apiUrl: "https://fortnite-api.com/v2/news?language=",
  },
  {
    id: "4",
    name: "EA Sports FC 26",
    image:
      "https://howlongtobeat.com/games/171044_EA_Sports_FC_26.jpg?width=720",
    apiUrl: "https://games-news-api.vercel.app/eafc/",
  },
  {
    id: "5",
    name: "Marvel Rivals",
    image:
      "https://m.media-amazon.com/images/M/MV5BMDExODM1MjItNDA1Zi00NGQ3LTkwYTctNmFhODhkNjRmNzJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    apiUrl: "https://games-news-api.vercel.app/marvelRivals/",
  },
];

// 2. إنشاء مكون فرعي للكارت مع استخدام Memo لمنع إعادة الرندر غير الضروري
const GameCard = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => onPress(item.name, item.apiUrl)}
      activeOpacity={0.7} // تحسين تجربة المستخدم البصرية
    >
      <Image
        source={{ uri: item.image }}
        style={styles.cover}
        resizeMode="cover" // ضمان ظهور الصورة بشكل جيد
      />
      <Text style={styles.title} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

function GamesNews() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  // 3. تحسين دالة الانتقال باستخدام useCallback
  const handleGamePress = useCallback(
    (gameName, apiUrl) => {
      navigation.navigate("GameNewsScreen", { gameName, apiUrl });
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("games.list.gamesNews")}</Text>

      {/* 4. استخدام FlatList للأداء العالي */}
      <FlatList
        data={GAMES_DATA}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GameCard item={item} onPress={handleGamePress} />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

export default GamesNews;

const styles = StyleSheet.create({
  container: {},
  header: {
    fontSize: 28,
    color: "white",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    fontWeight: "bold",
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  gameCard: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 16,
    padding: 10,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    height: 270,
    width: 160,
  },
  cover: {
    width: 140,
    height: 190,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
    width: 150,
  },
});
