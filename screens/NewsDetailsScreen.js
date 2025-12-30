import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { intervalToDuration } from "date-fns";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useEffect, useState } from "react";
import COLORS from "../constants/colors";
import { adUnitId } from "../constants/config";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

function NewsDetails({ article, visible, onClose }) {
  const { i18n, t } = useTranslation();
  const [showAds, setShowAds] = useState(false);
  const currentLang = i18n.language;

  // activate ads after the list loads
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowAds(true);
    });
    return () => task.cancel();
  }, []);

  const dateString = article?.pubDate;
  const formattedDate = format(new Date(dateString), "dd MMMM yyyy - hh:mm a", {
    locale: currentLang === "ar" ? ar : undefined,
  });

  let timeAgo = "";
  if (dateString) {
    const startDate = new Date(dateString);
    const endDate = new Date();

    if (!isNaN(startDate)) {
      const duration = intervalToDuration({
        start: startDate,
        end: endDate,
      });

      const { years, months, days, hours, minutes } = duration;

      // analyze duration and set timeAgo string
      if (years > 0) {
        timeAgo = `${years} ${t("news.duration.years")}`; // years
      } else if (months > 0) {
        timeAgo = `${months} ${t("news.duration.months")}`; // months
      } else if (days > 0) {
        timeAgo = `${days} ${t("news.duration.days")}`; // days
      } else if (hours > 0) {
        timeAgo =
          minutes > 0
            ? `${hours}${t("news.duration.hours")} ${minutes}${t(
                "news.duration.minutes"
              )}`
            : `${hours}${t("news.duration.hours")}`;
      } else {
        timeAgo = `${minutes}${t("news.duration.minutes")}`;
      }
    }
  }
  return (
    <Modal
      animationType="slide"
      backdropColor={COLORS.primary}
      visible={visible}
      onRequestClose={onClose}
      style={styles.modalContainer}
    >
      {/* Close Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Image
          style={styles.image}
          source={
            article?.thumbnail
              ? article.thumbnail
              : require("../assets/image-not-found.webp")
          }
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.content}>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.site}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                style={styles.siteImage}
                source={article.siteImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <Text style={styles.siteName}>{article.siteName}</Text>
            </View>
            <Text style={styles.date}>{timeAgo}</Text>
          </View>
          <Text style={styles.date}>{formattedDate}</Text>

          <View style={styles.description}>
            {article.description &&
            article.description !== undefined &&
            article.description !== null &&
            article.description !== "" ? (
              <Text style={styles.description}>
                {article.description.substring(0, 400)}..
              </Text>
            ) : (
              <Text style={styles.description}>
                {t("news.details.noDescription")}
              </Text>
            )}
          </View>
          {/* {showAds && (
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: true,
                }}
              />
            </View>
          )} */}
          <TouchableOpacity
            style={styles.button}
            android_ripple={{ color: "#779bdd" }}
            onPress={() => Linking.openURL(article.link)}
          >
            <Ionicons
              name="open-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>
              {t("news.details.readFullArticle")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    //   backgroundColor: COLORS.primary
  },
  header: {
    position: "absolute",
    width: 40,
    height: 40,
    top: 40,
    left: 15,
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  site: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 15,
  },
  siteImage: {
    width: 40,
    height: 40,
    borderRadius: 50,
    marginRight: 10,
  },
  siteName: {
    color: "white",
    fontSize: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(81, 105, 150, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    lineHeight: 32,
    textAlign: "center",
  },
  date: {
    color: "white",
    marginVertical: 20,
  },
  timeAgoText: {
    fontSize: 12,
    color: COLORS.secondary, // لون رمادي فاتح
    marginTop: 5,
    marginRight: 12,
  },
  description: {
    fontSize: 16,
    color: "#b7becb",
    lineHeight: 26,
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
  button: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default NewsDetails;
