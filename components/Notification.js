import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../Loading";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import NotificationService from "../notificationService";
import { useTranslation } from "react-i18next";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import useRssFeeds from "../hooks/useRssFeeds";
import COLORS from "../constants/colors";

const Notification = () => {
  const { rssFeeds, loading: loadingRss } = useRssFeeds();
  const [expandedCategories, setExpandedCategories] = useState({});
  const { t } = useTranslation();
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-4635812020796700~2053599689";

  const { preferences, loadingPreferences, toggleSource, setPreferences } =
    useNotificationPreferences();

  /**
   * Toggle entire category
   */
  const toggleCategory = useCallback(
    async (category) => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const categorySources = rssFeeds[category] || [];

      // Check if all are currently enabled to determine toggle direction
      const allEnabled = categorySources.every((source) => {
        const topic = NotificationService.getTopicName(category, source.name);
        return preferences[topic];
      });

      const newValue = !allEnabled;
      const newPreferences = { ...preferences };
      const updatePromises = [];

      // Prepare batch updates
      categorySources.forEach((source) => {
        const prefId = NotificationService.getTopicName(category, source.name);

        // Only update if the value is changing
        if (newPreferences[prefId] !== newValue) {
          newPreferences[prefId] = newValue;

          updatePromises.push(
            NotificationService.toggleNotificationPreference(
              userId,
              category,
              source.name,
              newValue
            )
          );
        }
      });

      // 1. Optimistic Update
      setPreferences(newPreferences);

      // 2. Execute Service calls in parallel
      await Promise.all(updatePromises);
    },
    [rssFeeds, preferences, setPreferences]
  );

  const toggleCategoryExpansion = useCallback((category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // Helper: Check category status (All Checked)
  const getCategoryToggleValue = useCallback(
    (category) => {
      const categorySources = rssFeeds[category] || [];
      if (categorySources.length === 0) return false;

      return categorySources.every((source) => {
        const topic = NotificationService.getTopicName(category, source.name);
        return preferences[topic];
      });
    },
    [rssFeeds, preferences]
  );

  // Helper: Check category status (Partially Checked)
  const getCategoryToggleIndeterminate = useCallback(
    (category) => {
      const categorySources = rssFeeds[category] || [];
      if (categorySources.length === 0) return false;

      const enabledCount = categorySources.filter((source) => {
        const topic = NotificationService.getTopicName(category, source.name);
        return preferences[topic];
      }).length;

      return enabledCount > 0 && enabledCount < categorySources.length;
    },
    [rssFeeds, preferences]
  );

  const renderCategorySection = (category, title) => {
    const sources = rssFeeds[category] || [];
    if (sources.length === 0) return null;

    const isExpanded = expandedCategories[category];
    const allEnabled = getCategoryToggleValue(category);
    const isIndeterminate = getCategoryToggleIndeterminate(category);

    return (
      <View key={category} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategoryExpansion(category)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={20}
              color="#779bdd"
              style={styles.chevronIcon}
            />
            <Text style={styles.categoryTitle}>{title}</Text>
            <Text style={styles.sourceCount}>({sources.length})</Text>
          </View>

          {/* Stop propagation to prevent expanding when clicking switch */}
          <TouchableOpacity onPress={() => toggleCategory(category)}>
            <Switch
              value={allEnabled}
              onValueChange={() => toggleCategory(category)}
              trackColor={{ false: "#3e3e3e", true: "#779bdd" }}
              thumbColor={allEnabled ? "#ffffff" : "#f4f3f4"}
              style={[
                styles.categorySwitch,
                isIndeterminate && styles.indeterminateSwitch,
              ]}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sourcesList}>
            {sources.map((source, index) => {
              const prefId = NotificationService.getTopicName(
                category,
                source.name
              );
              const isEnabled = preferences[prefId] || false;

              return (
                <View key={`${category}-${index}`} style={styles.sourceItem}>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    {source.language && (
                      <Text style={styles.sourceLanguage}>
                        {source.language.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={() => toggleSource(category, source.name)}
                    trackColor={{ false: "#3e3e3e", true: "#779bdd" }}
                    thumbColor={isEnabled ? "#ffffff" : "#f4f3f4"}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loadingPreferences || loadingRss) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.Textheader}>
          <Text style={styles.subtitle}>
            {t("settings.notifications.description")}
          </Text>
        </View>

        {renderCategorySection("news", "News")}
        {renderCategorySection("reviews", "Reviews")}
        {renderCategorySection("esports", "Esports")}
        {renderCategorySection("hardware", "Hardware")}

        <View style={{ alignItems: "center", width: "100%" }}>
          <BannerAd
            unitId={adUnitId}
            size={BannerAdSize.MEDIUM_RECTANGLE} // حجم مستطيل كبير
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={NotificationService.testLocalNotification}
          >
            <Ionicons name="notifications" size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Local Notification</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            {t("settings.notifications.footer")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  scrollView: {
    // flex: 1,
    paddingHorizontal: 20,
  },
  Textheader: {
    paddingTop: 20,
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: "#779bdd",
    lineHeight: 22,
  },
  categorySection: {
    marginBottom: 20,
    backgroundColor: "rgba(119, 155, 221, 0.1)",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevronIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 8,
  },
  sourceCount: {
    fontSize: 14,
    color: "#779bdd",
  },
  categorySwitch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  indeterminateSwitch: {
    opacity: 0.7,
  },
  sourcesList: {
    paddingVertical: 8,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(119, 155, 221, 0.1)",
  },
  sourceInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sourceName: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  sourceLanguage: {
    fontSize: 12,
    color: "#779bdd",
    marginLeft: 8,
    backgroundColor: "rgba(119, 155, 221, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#779bdd",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  testButtonSecondary: {
    backgroundColor: "#4CAF50",
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#779bdd",
    textAlign: "center",
    lineHeight: 20,
  },
  headerPrev: {
    position: "absolute",
    width: 40,
    height: 40,
    top: 50,
    left: 10,
    zIndex: 1000,
  },
});

export default Notification;
