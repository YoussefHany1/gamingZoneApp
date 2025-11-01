import { StatusBar } from "expo-status-bar";
import { FlatList } from "react-native";
import Slideshow from "../components/Slideshow";
import LatestNews from "../components/LatestNews";
// import Loading from "../Loading";

const sections = [
  <Slideshow website="arab_hardware" category="news" />,
  <LatestNews website="ign" category="news" limit={5} showDropdown={false} />,
  <LatestNews
    website="true_gaming"
    category="reviews"
    limit={5}
    showDropdown={false}
  />,
  <LatestNews
    website="dot_esports"
    category="esports"
    limit={5}
    showDropdown={false}
  />,
  <LatestNews
    website="tom_s_hardware"
    category="hardware"
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
        style={{ flex: 1, backgroundColor: "#0c1a33" }}
        showsVerticalScrollIndicator={false}
      />
      <StatusBar style="auto" />
    </>
  );
}
export default Home;
// const styles = StyleSheet.create({});
