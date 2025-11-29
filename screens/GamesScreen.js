import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import FreeGames from "../components/FreeGames";
import GamesList from "../components/GamesList";
import GamesNews from "../components/GamesNews";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";

function GamesScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(""); // store the currently typed text
  const [submittedQuery, setSubmittedQuery] = useState(""); // save the text after clicking enter
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });

    return () => task.cancel();
  }, []);

  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    if (text === "") {
      setSubmittedQuery("");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
  };
  // console.log(data)
  return (
    <>
      <SafeAreaView style={styles.container}>
        <View>
          {/* <Text style={styles.header}>{t('games.screen.header')}</Text> */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder={t("games.screen.searchPlaceholder")}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchTextChange}
              onSubmitEditing={() => setSubmittedQuery(searchQuery)} // Activate search when pressing enter
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearTextBtn}
                onPress={handleClearSearch}
              >
                <Ionicons name="close-sharp" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
          {submittedQuery === "" ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* if search is empty show the defult lists */}
                <View style={{ paddingBottom: 100 }}>
                  <FreeGames />
                  <GamesNews />
                  {showAds && (
                    <View style={styles.ad}>
                      <BannerAd
                        unitId={adUnitId}
                        size={BannerAdSize.MEDIUM_RECTANGLE}
                        requestOptions={{
                          requestNonPersonalizedAdsOnly: true,
                        }}
                      />
                    </View>
                  )}
                  <GamesList
                    endpoint="/popular"
                    header={t("games.list.popular")}
                  />
                  <GamesList
                    endpoint="/recently-released"
                    header={t("games.list.recentlyReleased")}
                  />
                  {showAds && (
                    <View style={styles.ad}>
                      <BannerAd
                        unitId={adUnitId}
                        size={BannerAdSize.MEDIUM_RECTANGLE}
                        requestOptions={{
                          requestNonPersonalizedAdsOnly: true,
                        }}
                      />
                    </View>
                  )}
                  <GamesList
                    endpoint="/top-rated"
                    header={t("games.list.topRated")}
                  />
                  <GamesList
                    endpoint="/coming-soon"
                    header={t("games.list.comingSoon")}
                  />

                  {showAds && (
                    <View style={styles.ad}>
                      <BannerAd
                        unitId={adUnitId}
                        size={BannerAdSize.MEDIUM_RECTANGLE} // حجم مستطيل كبير
                        requestOptions={{
                          requestNonPersonalizedAdsOnly: true,
                        }}
                      />
                    </View>
                  )}
                  <GamesList
                    endpoint="/most-anticipated"
                    header={t("games.list.mostAnticipated")}
                  />
                  <GamesList
                    endpoint="/nostalgia-corner"
                    header={t("games.list.nostalgiaCorner")}
                  />
                </View>
              </ScrollView>
            </>
          ) : (
            // if search not empty show search results
            <GamesList query={submittedQuery} />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

export default GamesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  // header: {
  //     color: "white",
  //     fontSize: 28,
  //     textAlign: "center",
  //     alignSelf: "center",
  //     fontWeight: "bold",
  //     backgroundColor: COLORS.secondary,
  //     paddingHorizontal: 15,
  //     paddingVertical: 8,
  //     margin: 30,
  //     marginTop: 10,
  //     borderRadius: 16
  // },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e2a45",
    marginHorizontal: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingBottom: 2,
    paddingTop: 10,
    borderRadius: 24,
    marginHorizontal: 50,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  searchBar: {
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  clearTextBtn: {
    marginBottom: 10,
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
});
