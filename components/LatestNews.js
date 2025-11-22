import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl
} from "react-native";
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import useFeed from "../hooks/useFeed";
import DropdownPicker from "../components/DropdownPicker";
import Loading from "../Loading";
import NewsDetails from "../screens/NewsDetailsScreen";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';

function LatestNews({ limit, language, category, website, selectedItem, onChangeFeed, showDropdown }) {
  const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-4635812020796700~2053599689';
  const [activeModal, setActiveModal] = useState(false);
  const feedCategory = typeof category !== "undefined" ? category : undefined;
  const feedWebsite = typeof website !== "undefined" && website !== null && website !== "" ? website : undefined;
  const { articles, loading, error, isFetching, refetch } = useFeed(feedCategory, feedWebsite);
  const { t } = useTranslation();
  const listData =
    typeof limit === "number" ? articles.slice(0, limit) : articles;

  function fromSnakeCase(input) {
    return input
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }



  const renderItem = ({ item, index }) => {
    const siteLabel = item?.siteName || website || "";
    // 2. نقوم بحساب ما إذا كان يجب إظهار الإعلان (كل 10 عناصر)
    // (index + 1) لأن الـ index يبدأ من 0
    const shouldShowAd = (index + 1) % 10 === 0;
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.NewsContainer, language === "ar" ? { direction: "rtl" } : { direction: "ltr" }]}
          android_ripple={{ color: COLORS.secondary }}
          onPress={() => {
            setActiveModal(`${item.id}`)
          }}
        >
          <NewsDetails article={item} visible={activeModal === `${item.id}`} onClose={() => setActiveModal(null)} />

          <View style={styles.textContainer}>
            <Text style={[styles.headline, language === "ar" ? { marginLeft: 8 } : { marginRight: 8 }]}>{item.title.substring(0, 100)}</Text>
            {
              item.description && item.description !== undefined && item.description !== null && item.description !== "" ?
                <Text numberOfLines={2} style={styles.par}>{item.description}..</Text> : null
            }
          </View>

          <View>
            <Image
              style={styles.thumbnail}
              source={
                item.thumbnail
                  ? { uri: item.thumbnail }
                  : require("../assets/image-not-found.webp")
              }
            />
            <Text style={styles.website}>{fromSnakeCase(siteLabel)}</Text>
          </View>
        </TouchableOpacity>
        {shouldShowAd && (
          <View style={styles.ad}>
            {/* تأكد من أن مكتبة BannerAd مستوردة بشكل صحيح */}
            <BannerAd
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
  };

  const renderHeader = () => {
    const translatedCategory = t(`news.tabs.${category.toLowerCase()}`);
    return (
      <>
        <Text style={styles.header}>
          {/* {t('news.latestHeader', { category: category.charAt(0).toUpperCase() + category.slice(1) })} */}
          {t('news.latestHeader', { category: translatedCategory })}
        </Text>
        {showDropdown !== false && (
          <DropdownPicker
            category={category}
            value={selectedItem}
            onChange={(item) => {
              if (typeof onChangeFeed === "function") {
                onChangeFeed(item);
              }
            }}
          />
        )}
      </>)
  };

  const onRefresh = () => {
    refetch(); // دالة TanStack Query لجلب البيانات
  };

  if (loading) return <Loading />;
  if (error)
    return (
      <Text style={{ color: "white", textAlign: "center" }}>
        Error: {error.message}, please try again later
      </Text>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching} // isFetching يكون صحيحاً أثناء التحديث في الخلفية أو اليدوي
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
          />
        }
      />
    </View>
  );
}
export default LatestNews;

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
    // marginVertical: 30,
    borderRadius: 16,
    color: "white",
  },
  NewsContainer: {
    alignItems: "center",
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
    marginRight: 12
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
    alignItems: 'center', width: '100%', marginVertical: 55
  }
});