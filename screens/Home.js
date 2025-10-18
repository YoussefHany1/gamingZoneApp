import { StatusBar } from "expo-status-bar";
import { FlatList } from "react-native";
import Slideshow from "../components/Slideshow";
import LatestNews from "../components/LatestNews";
// import DataFile from "../data.json";

const sections = [
  <Slideshow />,
  <LatestNews
    website="ign"
    category="news"
    // language={DataFile.news?.[4].language}
    limit={5}
    showDropdown={false}
  />,
  <LatestNews
    website="true_gaming"
    category="reviews"
    // language={DataFile.reviews?.[1].language}
    limit={5}
    showDropdown={false}
  />,
  <LatestNews
    website="guru3d"
    category="hardware"
    // language={DataFile.hardware?.[0].language}
    limit={5}
    showDropdown={false}
  />,
];

function Home() {
  const renderItem = ({ item }) => item;

  return (
    <>
      <FlatList
        data={sections}
        renderItem={renderItem}
        // keyExtractor={(item) => item.id}
        style={{ height: "100%", backgroundColor: "#0c1a33" }}
        showsVerticalScrollIndicator={false}
      />
      <StatusBar style="auto" />
    </>
  );
}
export default Home;
// const styles = StyleSheet.create({});
