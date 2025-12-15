import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  InteractionManager,
  FlatList,
  Text,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { Ionicons } from "@expo/vector-icons";

// Components
import FreeGames from "../components/FreeGames";
import GamesList from "../components/GamesList";
import GamesNews from "../components/GamesNews";

// Config & Constants
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";

// --- Sub-Component: Ad Container (Reusable) ---
// const AdContainer = () => {
//   const { t } = useTranslation();
//   return (
//     <View style={styles.adContainer}>
//       <Text style={styles.adLabel}>{t("common.ad")}</Text>
//       <BannerAd
//         unitId={adUnitId}
//         size={BannerAdSize.MEDIUM_RECTANGLE}
//         requestOptions={{
//           requestNonPersonalizedAdsOnly: true,
//         }}
//       />
//     </View>
//   );
// };

function GamesScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showAds, setShowAds] = useState(false);

  // 1. Optimize Ad Loading
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  // 2. Handlers (Memoized for performance)
  const handleSearchTextChange = useCallback((text) => {
    setSearchQuery(text);
    if (text === "") {
      setSubmittedQuery("");
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedQuery("");
    Keyboard.dismiss();
  }, []);

  const handleSubmitSearch = useCallback(() => {
    setSubmittedQuery(searchQuery);
    Keyboard.dismiss();
  }, [searchQuery]);

  // 3. Define Feed Structure (Data-Driven Approach)
  // This allows us to use FlatList instead of ScrollView
  const FEED_DATA = useMemo(
    () => [
      { id: "free_games", type: "COMPONENT", component: <FreeGames /> },
      { id: "news", type: "COMPONENT", component: <GamesNews /> },
      // { id: "ad_1", type: "AD" },
      {
        id: "popular",
        type: "LIST",
        endpoint: "/popular",
        titleKey: "games.list.popular",
      },
      {
        id: "recent",
        type: "LIST",
        endpoint: "/recently-released",
        titleKey: "games.list.recentlyReleased",
      },
      // { id: "ad_2", type: "AD" },
      {
        id: "top_rated",
        type: "LIST",
        endpoint: "/top-rated",
        titleKey: "games.list.topRated",
      },
      {
        id: "coming_soon",
        type: "LIST",
        endpoint: "/coming-soon",
        titleKey: "games.list.comingSoon",
      },
      // { id: "ad_3", type: "AD" },
      {
        id: "anticipated",
        type: "LIST",
        endpoint: "/most-anticipated",
        titleKey: "games.list.mostAnticipated",
      },
      {
        id: "nostalgia",
        type: "LIST",
        endpoint: "/nostalgia-corner",
        titleKey: "games.list.nostalgiaCorner",
      },
    ],
    []
  );

  // 4. Render Item Function for FlatList
  const renderFeedItem = useCallback(
    ({ item }) => {
      switch (item.type) {
        case "COMPONENT":
          return <View style={styles.sectionSpacing}>{item.component}</View>;

        // case "AD":
        //   return showAds ? <AdContainer /> : null;

        case "LIST":
          return (
            <View style={styles.sectionSpacing}>
              <GamesList endpoint={item.endpoint} header={t(item.titleKey)} />
            </View>
          );

        default:
          return null;
      }
    },
    [showAds, t]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Search Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("games.screen.searchPlaceholder")}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content: Conditional Rendering */}
      {submittedQuery !== "" ? (
        // Search Results State
        <View style={styles.contentContainer}>
          <GamesList query={submittedQuery} />
        </View>
      ) : (
        // Main Feed State (Optimized with FlatList)
        <FlatList
          data={FEED_DATA}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          initialNumToRender={3} // Performance optimization
          windowSize={5} // Performance optimization
          removeClippedSubviews={true} // Performance optimization
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

export default GamesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e2a45",
    marginHorizontal: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingBottom: 2,
    marginTop: 10,
    borderRadius: 24,
    marginHorizontal: 50,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  searchInput: {
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  adContainer: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  adLabel: {
    color: "#fff",
    marginBottom: 10,
  },
});
