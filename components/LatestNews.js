import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Linking,
  RefreshControl,
} from "react-native";
import useFeed from "../hooks/useFeed";
import DropdownPicker from "../components/DropdownPicker";
// import striptags from "striptags";

function fromSnakeCase(input) {
  return input
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function LatestNews(props) {
  const limit = props.limit;
  const language = props.language;
  const category = props.category;
  const website = props.website;
  const { articles, loading, error, refreshing, onRefresh } = useFeed(
    category,
    website
  );
  // Debug: Log the language value
  const listData =
    typeof limit === "number" ? articles.slice(0, limit) : articles;
  const renderItem = ({ item }) => {
    // const description = String(item.description).match(
    //   /<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i
    // )?.[1];
    // String(item.content).match(
    //   /<img[^>]+src=(?:'|"|)([^"' >]+)(?:'|"|)[^>]*>/i
    // );
    // const descriptionImage = description?.[1];
    // console.log("descriptionImage:", item["media:content"]?.[0]?.["url"]?.[0]);
    // const cleanDescription = striptags(String(item.description))
    //   .replace(/\s+/g, " ")
    //   .trim();
    console.log(item.description);
    return (
      <Pressable
        style={styles.NewsContainer}
        android_ripple={{ color: "#516996" }}
        onPress={() => {
          // Open the link in a web browser
          Linking.openURL(item.link[0]);
        }}
      >
        <View style={styles.textContainer}>
          <Text style={styles.headline}>{item.title.substring(0, 100)}</Text>
          <Text style={styles.par}>{item.description.substring(0, 60)}..</Text>
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
          <Text style={styles.website}>{fromSnakeCase(props.website)}</Text>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <>
      <Text style={styles.header}>Latest {props.category}</Text>
      {props.showDropdown !== false && (
        <DropdownPicker
          category={props.category}
          value={props.selectedItem}
          onChange={(item) => {
            if (typeof props.onChangeFeed === "function") {
              props.onChangeFeed(item);
            }
          }}
        />
      )}
    </>
  );

  if (loading)
    return (
      <Text style={{ color: "white", textAlign: "center" }}>Loading...</Text>
    );
  if (error)
    return (
      <Text style={{ color: "white", textAlign: "center" }}>
        Error: {error.message}, please try again later
      </Text>
    );

  return (
    <View style={[styles.container, language === "ar" && { direction: "rtl" }]}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#516996"
          />
        }
      />
    </View>
  );
}
export default LatestNews;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // alignItems: "center",
    // justifyContent: "center",
    // backgroundColor: "#0c1a33",
    // marginBottom: 30,
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
    // justifyContent: "center",
    // alignContent: "center",
    // alignSelf: "center",
    flexDirection: "row",
    // width: 350,
    // marginLeft: 80,
    // marginRight: 80,
    borderRadius: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#4a5565",
  },
  textContainer: {
    // flex: 1,
    // marginRight: 15,
    width: "65%",
  },
  headline: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 12,
    // marginLeft: 110,
    // Width: "5%",
    color: "white",
  },
  par: {
    fontSize: 12,
    // maxWidth: 180,
    // marginLeft: 110,
    color: "#b7becb",
  },
  thumbnail: {
    width: 135,
    height: 100,
    // marginLeft: 10,
    // marginRight: 70,
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
