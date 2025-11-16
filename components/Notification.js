import React, { useState, useEffect } from "react";
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
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {
  subscribeToTopic,
  unsubscribeFromTopic,
  saveNotificationPreference,
  getUserNotificationPreferences,
  getTopicName,
  testNotification,
  testTopicSubscription,
} from "../notificationService";

const Notification = ({ navigation }) => {
  const [rssFeeds, setRssFeeds] = useState({});
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    // Load RSS feeds from Firestore
    const unsubscribeRss = firestore()
      .collection("rss")
      .onSnapshot(
        (snapshot) => {
          let feeds = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            feeds = { ...feeds, ...data };
          });
          setRssFeeds(feeds);
        },
        (error) => {
          console.error("Error loading RSS feeds:", error);
        }
      );

    // Load user preferences
    const currentUser = auth().currentUser;
    if (currentUser) {
      loadUserPreferences(currentUser.uid);
    }

    return () => unsubscribeRss();
  }, []);

  const loadUserPreferences = async (userId) => {
    try {
      const prefs = await getUserNotificationPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = async (category) => {
    const userId = auth().currentUser?.uid;
    if (!userId) return; //  لو المستخدم مش موجود، اخرج

    const categorySources = rssFeeds[category] || [];
    const allEnabled = categorySources.every(
      (source) => preferences[`${category}_${source.name}`]
    );

    const newPreferences = { ...preferences };
    const promises = [];

    for (const source of categorySources) {
      const prefId = `${category}_${source.name}`;
      const topicName = getTopicName(category, source.name);
      const newValue = !allEnabled;

      newPreferences[prefId] = newValue;

      // Save to Firestore
      promises.push(
        saveNotificationPreference(
          userId,
          category,
          source.name,
          newValue
        )
      );

      // Subscribe/unsubscribe from FCM topic
      if (newValue) {
        promises.push(subscribeToTopic(topicName));
      } else {
        promises.push(unsubscribeFromTopic(topicName));
      }
    }

    setPreferences(newPreferences);
    await Promise.all(promises);
  };

  const toggleSource = async (category, source) => {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    const prefId = `${category}_${source.name}`;
    const topicName = getTopicName(category, source.name);
    const newValue = !preferences[prefId];

    const newPreferences = { ...preferences };
    newPreferences[prefId] = newValue;
    setPreferences(newPreferences);

    // Save to Firestore and FCM
    await Promise.all([
      saveNotificationPreference(
        userId,
        category,
        source.name,
        newValue
      ),
      newValue ? subscribeToTopic(topicName) : unsubscribeFromTopic(topicName),
    ]);
  };

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getCategoryToggleValue = (category) => {
    const categorySources = rssFeeds[category] || [];
    if (categorySources.length === 0) return false;

    const enabledCount = categorySources.filter(
      (source) => preferences[`${category}_${source.name}`]
    ).length;

    return enabledCount === categorySources.length;
  };

  const getCategoryToggleIndeterminate = (category) => {
    const categorySources = rssFeeds[category] || [];
    if (categorySources.length === 0) return false;

    const enabledCount = categorySources.filter(
      (source) => preferences[`${category}_${source.name}`]
    ).length;

    return enabledCount > 0 && enabledCount < categorySources.length;
  };

  const renderCategorySection = (category, title) => {
    const sources = rssFeeds[category] || [];
    const isExpanded = expandedCategories[category];
    const allEnabled = getCategoryToggleValue(category);
    const isIndeterminate = getCategoryToggleIndeterminate(category);

    if (sources.length === 0) return null;

    return (
      <View key={category} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategoryExpansion(category)}
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

        {isExpanded && (
          <View style={styles.sourcesList}>
            {sources.map((source, index) => {
              const prefId = `${category}_${source.name}`;
              const isEnabled = preferences[prefId] || false;

              return (
                <View key={index} style={styles.sourceItem}>
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
                    onValueChange={() => toggleSource(category, source)}
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

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.Textheader}>
          <Text style={styles.subtitle}>
            Choose which news sources you want to receive notifications from{"\n"}
            Make sure to allow notifications for this app
          </Text>
        </View>

        {renderCategorySection("news", "News")}
        {renderCategorySection("reviews", "Reviews")}
        {renderCategorySection("esports", "Esports")}
        {renderCategorySection("hardware", "Hardware")}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
          >
            <Ionicons name="notifications" size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Local Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.testButtonSecondary]}
            onPress={testTopicSubscription}
          >
            <Ionicons name="wifi" size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test FCM Subscription</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Notifications will be sent when new articles are published from
            enabled sources.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c1a33",
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
    paddingTop: 10,
    marginBottom: 20,
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
