import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import useFeed from "../hooks/useFeed";
import DropdownPicker from "../components/DropdownPicker";
import SkeletonNewsItem from "../skeleton/SkeletonNewsItem";
import NewsDetails from "../screens/NewsDetailsScreen";
import { useTranslation } from "react-i18next";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";

function LatestNews({
  limit,
  language,
  category,
  website,
  selectedItem,
  onChangeFeed,
  showDropdown,
  websitesList,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const { t } = useTranslation();
  const feedCategory = typeof category !== "undefined" ? category : undefined;
  const feedWebsite =
    typeof website !== "undefined" && website !== null && website !== ""
      ? website
      : undefined;

  const { articles, loading, error, isFetching, refetch } = useFeed(
    feedCategory,
    feedWebsite
  );
  let filteredArticles = articles;
  if ((!websitesList || websitesList.length === 0) && language) {
    filteredArticles = articles.filter((item) => item.language === language);
  }
  const listData =
    typeof limit === "number"
      ? filteredArticles.slice(0, limit)
      : filteredArticles;

  const handlePressArticle = useCallback((item) => {
    setSelectedArticle(item);
    setModalVisible(true);
  }, []);

  // ✅ 1. تحسين الأداء: استخدام useCallback لمنع إعادة إنشاء الدالة وتدمير الإعلانات
  const renderItem = useCallback(
    ({ item, index }) => {
      const siteLabel = item?.siteName || website || "";
      const shouldShowAd = (index + 1) % 10 === 0;
      return (
        <View
          style={[
            styles.container,
            language === "ar" ? { direction: "rtl" } : { direction: "ltr" },
          ]}
        >
          <TouchableOpacity
            style={[styles.NewsContainer]}
            android_ripple={{ color: COLORS.secondary }}
            onPress={() => handlePressArticle(item)}
          >
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.headline,
                  language === "ar" ? { marginLeft: 8 } : { marginRight: 8 },
                ]}
              >
                {item?.title ? item.title.substring(0, 100) : ""}
              </Text>
              {item?.description ? (
                <Text numberOfLines={2} style={styles.par}>
                  {item.description}..
                </Text>
              ) : null}
            </View>

            <View>
              <Image
                style={styles.thumbnail}
                source={
                  item?.thumbnail
                    ? { uri: item.thumbnail }
                    : require("../assets/image-not-found.webp")
                }
              />
              <Text style={styles.website}>{item.siteName}</Text>
            </View>
          </TouchableOpacity>
          {shouldShowAd && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                key={`ad-${index}`}
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: true,
                }}
              />
            </View>
          )}
        </View>
      );
    },
    [language, website, handlePressArticle]
  );

  // ✅ 2. تحسين الأداء: تثبيت الهيدر أيضاً
  const renderHeader = useCallback(() => {
    const safeCategory = category ? String(category).toLowerCase() : "";
    const translatedCategory = safeCategory
      ? t(`news.tabs.${safeCategory}`)
      : "";
    return (
      <>
        <Text style={styles.header}>
          {t("news.latestHeader", { category: translatedCategory })}
        </Text>
        {showDropdown !== false && (
          <DropdownPicker
            category={category}
            value={selectedItem}
            websites={websitesList}
            onChange={(item) => {
              if (typeof onChangeFeed === "function") {
                onChangeFeed(item);
              }
            }}
          />
        )}
      </>
    );
  }, [category, t, showDropdown, selectedItem, websitesList, onChangeFeed]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={{ marginTop: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonNewsItem key={i} language={language} />
          ))}
        </View>
      </View>
    );
  }

  if (error)
    return (
      <Text style={{ color: "white", textAlign: "center", marginTop: 20 }}>
        Error: {error.message}, please try again later
      </Text>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.$id ? `${item.$id}-${index}` : index.toString()
        }
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
        removeClippedSubviews={true} // مهم للأداء
        initialNumToRender={5} // تقليل العدد الأولي
        maxToRenderPerBatch={5} // تقليل الدفعات
        windowSize={10} // ✅ تقليل حجم النافذة في الذاكرة (الحل السحري لمشاكل الذاكرة)
      />
      {filteredArticles.length === 0 ? (
        <Text style={{ color: "white", textAlign: "center" }}>
          no data to show
          {/* {t("news.noArticles")} */}
        </Text>
      ) : null}
      {selectedArticle && (
        <NewsDetails
          article={selectedArticle}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setTimeout(() => setSelectedArticle(null), 300);
          }}
        />
      )}
    </View>
  );
}
export default memo(LatestNews);

const styles = StyleSheet.create({
  container: {
    // marginBottom: 40
  },
  header: {
    textAlign: "center",
    alignSelf: "center",
    fontSize: 28,
    fontWeight: "bold",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 80,
    paddingVertical: 10,
    marginBottom: 30,
    marginTop: 20,
    borderRadius: 16,
    color: "white",
  },
  NewsContainer: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#4a5565",
  },
  textContainer: {
    width: "65%",
  },
  headline: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 12,
    color: "white",
  },
  par: {
    fontSize: 12,
    color: "#779bdd",
    marginRight: 12,
  },
  thumbnail: {
    width: 135,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
  },
  website: {
    position: "absolute",
    bottom: 5,
    left: 15,
    fontSize: 10,
    marginTop: 8,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    borderRadius: 6,
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
