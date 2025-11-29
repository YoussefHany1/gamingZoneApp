import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";

function GamesNews() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.header}>{t("games.list.gamesNews")}</Text>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.gameCard}
          onPress={() =>
            navigation.navigate("GameNewsScreen", { gameName: "Fortnite" })
          }
        >
          <Image
            source={{
              uri: `https://howlongtobeat.com/games/3657_Fortnite.jpg`,
            }}
            style={styles.cover}
          />
          <Text style={styles.title} numberOfLines={2}>
            Fortnite
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gameCard}
          onPress={() =>
            navigation.navigate("GameNewsScreen", {
              gameName: "League of Legends",
            })
          }
        >
          <Image
            source={{
              uri: `https://newzoo.com/wp-content/uploads/api/games/artworks/game--league-of-legends.jpg`,
            }}
            style={styles.cover}
          />
          <Text style={styles.title} numberOfLines={2}>
            League of Legends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gameCard}
          onPress={() =>
            navigation.navigate("GameNewsScreen", { gameName: "Valorant" })
          }
        >
          <Image
            source={{
              uri: `https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/f657721a7eb06acae52a29ad3a951f20c1e5fc60-1920x1080.jpg`,
            }}
            style={styles.cover}
          />
          <Text style={styles.title} numberOfLines={2}>
            Valorant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gameCard}
          onPress={() =>
            navigation.navigate("GameNewsScreen", { gameName: "Marvel Rivals" })
          }
        >
          <Image
            source={{
              uri: `https://m.media-amazon.com/images/M/MV5BMDExODM1MjItNDA1Zi00NGQ3LTkwYTctNmFhODhkNjRmNzJkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg`,
            }}
            style={styles.cover}
          />
          <Text style={styles.title} numberOfLines={2}>
            Marvel Rivals
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
export default GamesNews;

const styles = StyleSheet.create({
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
    marginTop: 16,
    textAlign: "center",
    width: 150,
  },
});
