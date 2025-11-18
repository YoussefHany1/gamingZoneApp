import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Loading from '../Loading'
import { useNavigation } from '@react-navigation/native';
import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '@env';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.1.102:3000';

const CLIENT_ID = TWITCH_CLIENT_ID;
const CLIENT_SECRET = TWITCH_CLIENT_SECRET;
const IGDB_URL = "https://api.igdb.com/v4/games";

let cachedToken = null;
async function getAppToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10000) {
    return cachedToken.token;
  }
  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&grant_type=client_credentials`,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to get token: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

function formatPath(text) {
  return text
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .flatMap(part => part.split('-'))
    .filter(Boolean)
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

// for rating background
function getRatingColor(rating) {
  if (rating <= 2) return '#8B0000';
  if (rating <= 4) return '#FF4C4C';
  if (rating <= 6) return '#FFA500';
  if (rating <= 8) return '#71e047';
  return '#006400';
};

const generateCacheKey = (type, value) => `games_cache:${type}:${value}`;

export default function GamesList({ endpoint, query }) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  // 4. fetch data from localhost
  const fetchGamesFromServer = useCallback(async (ep) => {
    setLoading(true);
    setGames([]); // تفريغ القائمة مؤقتاً عند تغيير التصنيف
    setError(null);
    const cacheKey = generateCacheKey('server', ep);
    let cacheFound = false;

    // 4.1. محاولة عرض الكاش فوراً
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        console.log(`📦 Showing Cached Data immediately for endpoint: ${ep}`);
        setGames(parsedData.data);
        setLoading(false); // إظهار المحتوى للمستخدم
        cacheFound = true;
      }
    } catch (e) {
      console.error("Error reading cache:", e);
    }

    // 4.2. جلب البيانات الجديدة من الخادم في الخلفية (Sync)
    const url = `${SERVER_URL}${ep}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned status: ${res.status}`);
      const data = await res.json();

      console.log(`🔥 Server update received for endpoint: ${ep} - Syncing UI...`);
      setGames(data); // تحديث الواجهة بالبيانات الجديدة
      setLoading(false);

      // 4.3. تخزين البيانات الجديدة في الكاش
      const cacheData = { data: data, timestamp: Date.now() };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    } catch (e) {
      console.error("Network request failed:", e);
      // إذا لم نجد كاش في البداية، وفشلت الشبكة أيضاً، نعرض خطأ
      if (!cacheFound) {
        setError(`${t('games.list.serverError')}`);
      } else {
        console.log("Keeping cached data displayed despite network error.");
      }
      setLoading(false);
    }
  }, [t]);

  // 5. ftech data from IGDB for serach
  const fetchGamesFromIGDB = useCallback(async (q) => {
    setLoading(true);
    setGames([]);
    setError(null);
    const cacheKey = generateCacheKey('search', q);
    let cacheFound = false;

    // 5.1. محاولة عرض الكاش فوراً
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // console.log(`📦 Showing Cached Data immediately for query: ${q}`);
        setGames(parsedData.data);
        setLoading(false);
        cacheFound = true;
      }
    } catch (e) {
      console.error("Error reading cache:", e);
    }

    // 5.2. جلب البيانات من IGDB في الخلفية
    try {
      const token = await getAppToken();
      const body = `
                fields id, name, cover.image_id, first_release_date, total_rating, game_type;
                search "${q}";
                limit 50;
            `;
      const res = await fetch(IGDB_URL, {
        method: "POST",
        headers: { "Client-ID": CLIENT_ID, "Authorization": `Bearer ${token}`, "Content-Type": "text/plain", "Accept": "application/json" },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`IGDB fetch failed: ${res.status} ${res.statusText} ${text}`);
      }

      const json = await res.json();
      // console.log(`🔥 IGDB update received for query: ${q} - Syncing UI...`);
      setGames(json);
      setLoading(false);

      // حفظ الكاش الجديد
      const cacheData = { data: json, timestamp: Date.now() };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    } catch (err) {
      console.error("Error fetching search results:", err);
      if (!cacheFound) {
        setError(err.message || `${t('games.list.serverError')}`);
      }
      setLoading(false);
    }
  }, [t]);

  // useEffect decides which function to call
  useEffect(() => {
    if (endpoint) {
      // If 'endpoint' exists, call the server
      fetchGamesFromServer(endpoint);
    } else if (query) {
      // If 'query' exists, call IGDB
      fetchGamesFromIGDB(query);
    } else {
      // If neither of them is present, do nothing
      setGames([]);
      setLoading(false);
      setError(null);
    }
  }, [endpoint, query, fetchGamesFromServer, fetchGamesFromIGDB]);

  // game type
  const GAME_TYPE_LABELS = {
    1: 'DLC',
    2: 'Expansion',
    5: 'MOD',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded',
  };
  // console.log(games)
  const renderGame = ({ item }) => {
    const label = GAME_TYPE_LABELS[item.game_type];
    return (
      <TouchableOpacity style={styles.gameCard} onPress={() => navigation.navigate('GameDetails', { gameID: item.id })}>
        <Image
          source={item.cover ? { uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg` } : require("../assets/image-not-found.webp")}
          style={styles.cover}
        />
        {
          label && (
            <Text style={styles.gameType}>{label}</Text>
          )
        }
        {item.total_rating != null && <Text style={[
          styles.rating,
          { backgroundColor: getRatingColor(item.total_rating / 10) }
        ]}>{Math.round(item.total_rating) / 10}</Text>}

        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
    )
  };

  // change headerText (Title) based on props
  const headerText = endpoint ? formatPath(endpoint) : (query ? `${t('games.list.searchResults')}` : null);

  return (
    <View style={styles.container}>
      {headerText && <Text style={styles.header}>{headerText}</Text>}

      {loading && <Loading />}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && games.length === 0 && (query || endpoint) && (
        <Text style={styles.noResults}>{t('games.list.noResults')}</Text>
      )}

      {!loading && !error && games.length > 0 && (
        <FlatList
          data={games}
          horizontal={!!endpoint}
          numColumns={query ? 2 : 1}
          key={query ? 'grid' : 'list'}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGame}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 5,
            ...(query && { alignItems: 'center', paddingBottom: 340 }),
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  header: { fontSize: 28, color: 'white', margin: 12, fontWeight: 'bold' },
  gameCard: {
    borderWidth: 1,
    borderColor: "#516996",
    padding: 10,
    borderRadius: 16,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    width: 150,
    height: 200,
    borderRadius: 10,
    backgroundColor: "#516996",
  },
  gameType: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "white",
    fontWeight: "600",
    top: 0,
    left: 0,
    padding: 5,
    margin: 12,
    borderRadius: 12
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
    width: 150
  },
  rating: {
    color: "white",
    position: "absolute",
    textAlign: "center",
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    textAlignVertical: "center",
    width: 50,
    height: 50,
    top: 0,
    right: 0,
    fontSize: 20,
    fontWeight: "bold",
  },
  error: { color: '#ffcccc', textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
  noResults: {
    color: '#999',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 20,
  }
});
