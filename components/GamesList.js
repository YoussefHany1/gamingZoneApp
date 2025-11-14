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

export default function GamesList({ endpoint, query }) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [error, setError] = useState(null);

  // 4. fetch data from localhost
  const fetchGamesFromServer = useCallback(async (ep) => {
    setLoading(true);
    setGames([]);
    setError(null);
    const url = `${SERVER_URL}${ep}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned status: ${res.status}`);
      const data = await res.json();
      setGames(data);
    } catch (e) {
      console.error(e);
      setError('The connection to the server failed. Please ensure the server is running and that you are using the correct IP address.');
    }
    setLoading(false);
  }, []);

  // 5. ftech data from IGDB for serach
  const fetchGamesFromIGDB = useCallback(async (q) => {
    setLoading(true);
    setGames([]);
    setError(null);

    try {
      const token = await getAppToken();
      const body = `
                fields id, name, cover.image_id, first_release_date, total_rating, cover.url, dlcs, remakes, remasters, release_dates.human;
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
      setGames(json);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(err.message);
      setGames([]);
    }
    setLoading(false);
  }, []);

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


  const renderGame = ({ item }) => (
    <TouchableOpacity style={styles.gameCard} onPress={() => navigation.navigate('GameDetails', { gameID: item.id })}>
      <Image
        source={item.cover ? { uri: `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg` } : require("../assets/image-not-found.webp")}
        style={styles.cover}
      />
      {item.total_rating != null && <Text style={[
        styles.rating,
        { backgroundColor: getRatingColor(item.total_rating / 10) }
      ]}>{Math.round(item.total_rating) / 10}</Text>}

      <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  // change headerText (Title) based on props
  const headerText = endpoint ? formatPath(endpoint) : (query ? "Search Results" : null);

  return (
    <View style={styles.container}>
      {headerText && <Text style={styles.header}>{headerText}</Text>}

      {loading && <Loading />}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && games.length === 0 && (query || endpoint) && (
        <Text style={styles.noResults}>No games found.</Text>
      )}

      {!loading && !error && games.length > 0 && (
        <FlatList
          data={games}
          horizontal={true}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGame}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 5 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { // إضافة margin للـ container لفصل القوائم
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
    height: 150,
    borderRadius: 10,
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
