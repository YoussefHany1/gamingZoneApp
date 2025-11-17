import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import useFeed from "../hooks/useFeed";
import DropdownPicker from "../components/DropdownPicker";
import Loading from "../Loading";
import NewsDetails from "../screens/NewsDetailsScreen";
import { useState } from "react";
import { useTranslation } from 'react-i18next';


function LatestNews({ limit, language, category, website, selectedItem, onChangeFeed, showDropdown }) {
  const [activeModal, setActiveModal] = useState(false);
  const { articles, loading, error } = useFeed(category, website);
  const { t } = useTranslation();
  const listData =
    typeof limit === "number" ? articles.slice(0, limit) : articles;

  function fromSnakeCase(input) {
    return input
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.NewsContainer}
        android_ripple={{ color: "#516996" }}
        onPress={() => {
          setActiveModal(`${item.id}`)
        }}
      >
        <NewsDetails article={item} visible={activeModal === `${item.id}`} onClose={() => setActiveModal(null)} />

        <View style={styles.textContainer}>
          <Text style={styles.headline}>{item.title.substring(0, 100)}</Text>
          <Text numberOfLines={2} style={styles.par}>{item.description}..</Text>
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
          <Text style={styles.website}>{fromSnakeCase(website)}</Text>
        </View>
      </TouchableOpacity>
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

  if (loading) return <Loading />;
  if (error)
    return (
      <Text style={{ color: "white", textAlign: "center" }}>
        Error: {error.message}, please try again later
      </Text>
    );

  return (
    <View style={[styles.container, language === "ar" ? { direction: "rtl" } : { direction: "ltr" }]}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      // refreshControl={
      //   <RefreshControl
      //     refreshing={refreshing}
      //     onRefresh={onRefresh}
      //     tintColor="#516996"
      //   />
      // }
      />
    </View>
  );
}
export default LatestNews;

const styles = StyleSheet.create({
  container: {
    marginBottom: 40
  },
  header: {
    textAlign: "center",
    alignSelf: "center",
    fontSize: 28,
    fontWeight: "bold",
    backgroundColor: "#516996",
    paddingHorizontal: 80,
    paddingVertical: 10,
    marginVertical: 30,
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
});