import {
    View,
    Text,
    StyleSheet,
    Image,
    ImageBackground,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import YoutubePlayer from "react-native-youtube-iframe";
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loading from '../Loading'
import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '@env';
import { useTranslation } from 'react-i18next';

const CLIENT_ID = TWITCH_CLIENT_ID;
const CLIENT_SECRET = TWITCH_CLIENT_SECRET;
const IGDB_URL = "https://api.igdb.com/v4/games";
const CACHE_KEY_PREFIX = 'GAME_DETAILS_CACHE_';

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

async function fetchGameById(id) {
    if (!id) throw new Error("fetchGameById: missing id");
    const token = await getAppToken();
    const body = `
    fields id, name, cover.image_id, first_release_date, total_rating, total_rating_count, summary, dlcs, game_type, multiplayer_modes, remakes, remasters, screenshots.image_id, release_dates.human, platforms.abbreviation, websites.type, websites.url, genres.name, game_modes.name, language_supports.language.name, language_supports.language_support_type.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_engines.name, videos.name, videos.video_id, collection.name, similar_games.name, similar_games.cover.image_id, collections.games.name, collections.games.cover.image_id;
    where id = ${id};
    limit 1;
  `;
    const res = await fetch(IGDB_URL, {
        method: "POST",
        headers: {
            "Client-ID": CLIENT_ID,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "text/plain",
            "Accept": "application/json",
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`IGDB fetch failed: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json();
    return Array.isArray(json) && json.length ? json[0] : null;
}


function GameDetails({ route, navigation }) {
    const { gameID: initialGameID } = route.params;
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentId, setCurrentId] = useState(initialGameID);
    const mountedRef = useRef(true);
    const scrollRef = useRef(null);

    const [user, setUser] = useState();
    const [authLoading, setAuthLoading] = useState(true);
    const [isWanted, setIsWanted] = useState(false);
    const [isPlayed, setIsPlayed] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // --- 2. useEffect لمراقبة حالة المصادقة ---
    useEffect(() => {
        const subscriber = auth().onAuthStateChanged((u) => {
            setUser(u);
            setAuthLoading(false);
        });
        return subscriber;
    }, []);


    useEffect(() => {
        if (initialGameID && initialGameID !== currentId) {
            setCurrentId(initialGameID);
        }
    }, [initialGameID]);

    // --- التعديل هنا: دمج الكاش مع جلب البيانات ---
    useEffect(() => {
        if (!currentId) {
            setError("No game ID provided");
            setGame(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);
        const cacheKey = `${CACHE_KEY_PREFIX}${currentId}`; // مفتاح كاش فريد لكل لعبة

        const loadGameData = async () => {
            let cacheFound = false;

            // 1. محاولة قراءة الكاش
            try {
                const cachedString = await AsyncStorage.getItem(cacheKey);
                if (cachedString && !cancelled) {
                    const cachedData = JSON.parse(cachedString);
                    console.log(`📦 Showing Cached Game Details for: ${currentId}`);
                    setGame(cachedData.data);
                    setLoading(false); // عرض البيانات فوراً
                    cacheFound = true;

                    // سكرول للأعلى عند عرض الكاش
                    setTimeout(() => {
                        try {
                            scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
                        } catch (e) { }
                    }, 50);
                }
            } catch (e) {
                console.error("Cache read error:", e);
            }

            // 2. جلب البيانات الحديثة من الشبكة (في الخلفية)
            try {
                const fetchedGame = await fetchGameById(currentId);

                if (cancelled || !mountedRef.current) return;

                console.log(`🔥 Fresh Game Details received for: ${currentId}`);
                setGame(fetchedGame);
                setLoading(false);

                // 3. تحديث الكاش
                const dataToSave = {
                    data: fetchedGame,
                    timestamp: Date.now()
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify(dataToSave));

                // إذا لم يكن هناك كاش، نقوم بالسكرول الآن
                if (!cacheFound) {
                    setTimeout(() => {
                        try {
                            scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
                        } catch (e) { }
                    }, 50);
                }

            } catch (err) {
                console.error("fetchGameById error:", err);
                if (cancelled || !mountedRef.current) return;

                // لا نعرض رسالة الخطأ إذا كنا نعرض بالفعل بيانات من الكاش
                if (!cacheFound) {
                    setError(err.message || "Failed to load game");
                    setGame(null);
                }
                setLoading(false);
            }
        };

        loadGameData();

        return () => {
            cancelled = true;
        };
    }, [currentId]); // <-- سيعمل هذا الـ effect عند تغيير currentId

    useEffect(() => {
        // --- 4. التعديل الأهم: ننتظر انتهاء تحميل المصادقة ---
        if (authLoading || !user || !currentId) {
            setIsWanted(false);
            setIsPlayed(false);
            return;
        }

        const gameIdStr = String(currentId);

        // 1. مراقبة قائمة "Want"
        const wantRef = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('wantList')
            .doc(gameIdStr);

        const unsubWant = wantRef.onSnapshot(
            (doc) => {
                if (mountedRef.current) {
                    setIsWanted(doc && doc.exists);
                }
            },
            (error) => {
                console.error("Firestore (wantList) snapshot error: ", error);
            }
        );

        // 2. مراقبة قائمة "Played"
        const playedRef = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('playedList')
            .doc(gameIdStr);

        const unsubPlayed = playedRef.onSnapshot(
            (doc) => {
                if (mountedRef.current) {
                    setIsPlayed(doc && doc.exists);
                }
            },
            (error) => {
                console.error("Firestore (playedList) snapshot error: ", error);
            }
        );

        return () => {
            unsubWant();
            unsubPlayed();
        };
    }, [currentId, user, authLoading]);

    console.log(game)
    function getRatingColor(rating) {
        if (rating <= 2) return "#8B0000";
        if (rating <= 4) return "#FF4C4C";
        if (rating <= 6) return "#FFA500";
        if (rating <= 8) return "#71e047";
        return "#006400";
    }

    const storeIcons = {
        13: require("../assets/steam.png"),
        16: require("../assets/epic-games.png"),
        17: require("../assets/gog.png"),
        23: require("../assets/playstation.png"),
        22: require("../assets/xbox.png"),
        24: require("../assets/nintendo-switch.png"),
        12: require("../assets/play-store.png"),
        10: require("../assets/apple-store.png"),
    };

    // --- دوال جديدة للضغط على الأزرار ---
    const getGameData = () => {
        if (!game) return null;
        return {
            id: game.id,
            name: game.name,
            cover_image_id: game.cover?.image_id || null,
            release_date: game.release_dates?.[0]?.human || "N/A",
        };
    };

    const handleWant = async () => {
        if (authLoading) return;

        if (!user) {
            Alert.alert("Login required", "Please log in, to be able to add games to your lists.");
            return;
        }
        if (!game) return;

        const gameIdStr = String(game.id);
        const gameData = getGameData();
        const wantRef = firestore().collection('users').doc(user.uid).collection('wantList').doc(gameIdStr);
        const playedRef = firestore().collection('users').doc(user.uid).collection('playedList').doc(gameIdStr);

        if (isWanted) {
            await wantRef.delete();
        } else {
            await wantRef.set(gameData);
            if (isPlayed) {
                await playedRef.delete();
            }
        }
    };

    const handlePlayed = async () => {
        if (authLoading) return;
        if (!user) {
            Alert.alert("Login required", "Please log in, to be able to add games to your lists.");
            return;
        }
        if (!game) return;

        const gameIdStr = String(game.id);
        const gameData = getGameData();
        const wantRef = firestore().collection('users').doc(user.uid).collection('wantList').doc(gameIdStr);
        const playedRef = firestore().collection('users').doc(user.uid).collection('playedList').doc(gameIdStr);

        if (isPlayed) {
            await playedRef.delete();
        } else {
            await playedRef.set(gameData);
            if (isWanted) {
                await wantRef.delete();
            }
        }
    };

    const isReleased = game?.first_release_date
        ? (game?.first_release_date * 1000) <= Date.now()
        : true;
    let images = [];
    if (!loading && !error && game?.cover?.image_id) {
        images.push(`https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.image_id}.jpg`);
    }

    if (!loading && !error && Array.isArray(game?.screenshots)) {
        const screenshotImages = game.screenshots.map(
            (shot) => `https://images.igdb.com/igdb/image/upload/t_720p/${shot.image_id}.jpg`
        );
        images.push(...screenshotImages);
    }
    console.log(game);
    return (
        <SafeAreaView
            edges={['right', 'bottom', 'left']}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading && <Loading />}

            {!loading && error && (
                <View style={{ padding: 20, backgroundColor: "#0c1a33" }}>
                    <Text style={{ color: "red", textAlign: "center" }}>Error: {error}</Text>
                </View>
            )}

            {!loading && !error && !game && (
                <View style={{ padding: 20, backgroundColor: "#0c1a33" }}>
                    <Text style={{ color: "white", textAlign: "center" }}>No data to display</Text>
                </View>
            )}

            {!loading && game && (
                <ScrollView ref={scrollRef} style={styles.container} showsVerticalScrollIndicator={false}>
                    {game.cover?.image_id ?
                        <Image
                            style={styles.image}
                            source={{ uri: `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover?.image_id}.jpg` }}
                        />
                        : <Image
                            style={styles.image}
                            source={require("../assets/image-not-found.webp")}
                        />
                    }
                    <View style={styles.backgroundContainer}>
                        <LinearGradient
                            colors={["transparent", "#0c1a33"]}
                            style={styles.gradient}
                            start={{ x: 1, y: 0.5 }}
                            end={{ x: 0, y: 0.5 }}
                        />
                        <LinearGradient
                            colors={["#0c1a33", "transparent"]}
                            style={styles.gradient}
                            start={{ x: 1, y: 0.5 }}
                            end={{ x: 0, y: 0.5 }}
                        />
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.title}>{game.name}</Text>
                        <Text style={styles.releaseDate}>{game.release_dates?.[0]?.human}</Text>
                        <View style={styles.contentHeader}>
                            <View style={styles.platformContainer}>
                                {game.platforms?.map((platform) => (
                                    <Text key={platform.id} style={styles.platform}>
                                        {platform.abbreviation}
                                    </Text>
                                ))}
                            </View>
                            {/* rating section */}
                            {game.total_rating ? (
                                <Text
                                    style={[
                                        styles.rating,
                                        { backgroundColor: getRatingColor(game.total_rating / 10) },
                                    ]}
                                >
                                    {Math.round(game.total_rating) / 10}
                                </Text>
                            ) : (
                                <Text style={[styles.rating, { backgroundColor: "#516996" }]}>N/A</Text>
                            )}
                        </View>
                        {/* stores section */}
                        {game.websites && <Text style={styles.storesHeader}>{t('games.details.availableStores')}</Text>}
                        <View style={styles.storesContainer}>
                            {game.websites?.map((site) => {
                                const icon = storeIcons[site.type];
                                if (!icon) return null;
                                return (
                                    <TouchableOpacity key={site.id} style={styles.storesBtn} onPress={() => Linking.openURL(site.url)}>
                                        <Image style={styles.storeImg} resizeMode="contain" source={icon} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {/* Buttons section */}
                        <View style={styles.playContainer}>
                            <TouchableOpacity style={[styles.wantBtn, isWanted && styles.wantBtnActive]} onPress={handleWant}>
                                <Text style={styles.wantBtnText}>
                                    <Ionicons name={isWanted ? "bookmark" : "bookmark-outline"} size={20} color="white" /> {t('games.details.buttons.want')}
                                </Text>
                            </TouchableOpacity>
                            {isReleased && (
                                <TouchableOpacity style={[styles.playedBtn, isPlayed && styles.playedBtnActive]} onPress={handlePlayed}>
                                    <Text style={styles.playedBtnText}>
                                        <Ionicons name={isPlayed ? "checkmark-done" : "checkmark-sharp"} size={24} color="white" /> {t('games.details.buttons.played')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* About Section */}
                        <View>
                            <Text style={styles.detailsHeader}>{t('games.details.about')}</Text>
                            <Text style={styles.summary}>{game.summary}</Text>
                        </View>

                        <View style={styles.details}>
                            {/* generes section */}
                            {game.genres && (
                                <View style={styles.textCard}>
                                    <Text style={styles.detailsHeader}>{t('games.details.genres')}</Text>
                                    {game.genres.map((genre) => (
                                        <View key={genre.id}>
                                            <Text style={styles.detailsText}>{genre.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {/* Game mode section */}
                            {game.game_modes && (
                                <View style={styles.textCard}>
                                    <Text style={styles.detailsHeader}>{t('games.details.gameModes')}</Text>
                                    {game.game_modes.map((mode) => (
                                        <View key={mode.id}>
                                            <Text style={styles.detailsText}>{mode.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {game.involved_companies && (
                                <>
                                    {/* Developers section*/}
                                    {game.involved_companies.some(company => company.developer) && (
                                        <View style={styles.textCard}>
                                            <Text style={styles.detailsHeader}>{t('games.details.developer')}</Text>
                                            {game.involved_companies
                                                .filter(company => company.developer)
                                                .map(company => (
                                                    <Text key={company.id} style={styles.detailsText}>
                                                        {company.company.name}
                                                    </Text>
                                                ))}
                                        </View>
                                    )}

                                    {/* Publishers section*/}
                                    {game.involved_companies.some(company => company.publisher) && (
                                        <View style={styles.textCard}>
                                            <Text style={styles.detailsHeader}>{t('games.details.publisher')}</Text>
                                            {game.involved_companies
                                                .filter(company => company.publisher)
                                                .map(company => (
                                                    <Text key={company.id} style={styles.detailsText}>
                                                        {company.company.name}
                                                    </Text>
                                                ))}
                                        </View>
                                    )}
                                </>
                            )}
                            {/* language supports section*/}
                            {game.language_supports && (
                                <>
                                    <View style={styles.textCard}>
                                        <Text style={styles.detailsHeader}>{t('games.details.languages.title')}</Text>
                                        {["Audio", "Subtitles", "Interface"].map((type) => {
                                            const langs = game.language_supports
                                                ?.filter(l => l.language_support_type.name === type)
                                                .map(l => l.language.name);

                                            return langs.length ? (
                                                <Text key={type} style={styles.langs}>
                                                    {/* {type}: {langs.join(", ")} */}
                                                    <Text style={styles.detailsText}>{type}:</Text> {langs.join(", ")}
                                                </Text>
                                            ) : null;
                                        })}
                                    </View>
                                </>
                            )}
                            {/* Game Engines section */}
                            {game.game_engines && (
                                <View style={styles.textCard}>
                                    <Text style={styles.detailsHeader}>{t('games.details.engines')}</Text>
                                    {game.game_engines.map((engine) => (
                                        <View key={engine.id}>
                                            <Text style={styles.detailsText}>{engine.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                        {/* Game Trailer section */}
                        {game.videos && (
                            <View style={styles.trailerContainer}>
                                {(() => {
                                    const trailer =
                                        game.videos.find((v) => v.name === "Trailer") ||
                                        game.videos.find((v) => v.name === "Announcement Trailer") ||
                                        game.videos.find((v) => v.name === "Teaser") ||
                                        game.videos.find((v) => v.name === "Release Date Trailer") ||
                                        game.videos.find((v) => v.name === "Gameplay Trailer");
                                    if (trailer?.video_id) {
                                        return (
                                            <>
                                                <Text style={styles.detailsHeader}>{t('games.details.trailer')}</Text>
                                                <View style={styles.ytVid}>
                                                    <YoutubePlayer height={250} videoId={trailer.video_id} />
                                                </View>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}
                            </View>
                        )}
                        {/* Collection section */}
                        {game.collections?.[0]?.games &&
                            <View style={{ marginTop: 20 }}>
                                <Text style={styles.detailsHeader}>{t('games.details.series')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                    {game.collections?.[0]?.games.map((g) => (
                                        <TouchableOpacity
                                            key={g.id}
                                            style={styles.similarCard}
                                            onPress={() => {
                                                setCurrentId(g.id);
                                            }}
                                        >
                                            <Image
                                                style={styles.similarImg}
                                                source={
                                                    g?.cover?.image_id
                                                        ? { uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg` }
                                                        : require("../assets/image-not-found.webp")
                                                }
                                            />
                                            <Text style={styles.similarName} numberOfLines={2}>
                                                {g.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        }
                        {/* Similar Games section */}
                        {game?.similar_games && game.similar_games.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <Text style={styles.detailsHeader}>{t('games.details.similar')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                    {game.similar_games.map((sg) => (
                                        <TouchableOpacity
                                            key={sg.id}
                                            style={styles.similarCard}
                                            onPress={() => {
                                                setCurrentId(sg.id);
                                            }}
                                        >
                                            <Image
                                                style={styles.similarImg}
                                                source={
                                                    sg?.cover?.image_id
                                                        ? { uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${sg.cover.image_id}.jpg` }
                                                        : require("../assets/image-not-found.webp")
                                                }
                                            />
                                            <Text style={styles.similarName} numberOfLines={2}>
                                                {sg.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <ImageBackground blurRadius={2}
                        source={
                            game.cover.image_id ? { uri: `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.image_id}.jpg` } : null
                        }
                        style={{ height: "100%", width: "100%", opacity: .4, position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: -100, backgroundColor: "#0c1a33", marginTop: 350 }} imageStyle={{
                            resizeMode: "cover",
                        }}
                    />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

export default GameDetails;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0c1a33",
        marginBottom: 20
    },
    backgroundContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: "100%"
    },
    gradient: {
        height: "100%",
        width: "50%"
    },
    header: {
        position: "absolute",
        width: 40,
        height: 40,
        top: 50,
        left: 10,
        zIndex: 1000,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(81, 105, 150, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: 350,
        resizeMode: "cover",
        zIndex: 100
    },
    content: {
        padding: 15,
        paddingBottom: 40,
    },
    title: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
    },
    releaseDate: {
        color: "gray",
        letterSpacing: 2

    },
    contentHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    platformContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        flex: 1,
    },
    platform: {
        color: "white",
        fontSize: 17,
        fontWeight: "500",
        backgroundColor: "rgb(81, 105,150, 0.3)",
        paddingVertical: 3,
        paddingHorizontal: 10,
        marginRight: 10,
        marginBottom: 10,
        borderRadius: 14,
    },
    rating: {
        color: "white",
        textAlign: "center",
        borderRadius: 50,
        textAlignVertical: "center",
        width: 70,
        height: 70,
        fontSize: 34,
        fontWeight: "bold",
    },
    storesHeader: {
        color: "white",
        fontWeight: "600",
        fontSize: 24,
        marginBottom: 10,
        marginTop: 5
    },
    storesContainer: {
        flexDirection: "row",
        flexWrap: "wrap"
    },
    storesBtn: {
        backgroundColor: "#516996",
        borderWidth: 1,
        borderColor: "#779bdd",
        borderRadius: 12,
        marginRight: 10,
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center"
    },
    storeImg: {
        borderRadius: 12,
        width: 50,
        height: 50,

    },
    playContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        margin: 10,
        marginTop: 20
    },
    wantBtn: {
        flex: 1,
        backgroundColor: "#516996",
        borderRadius: 8,
        marginRight: 10,
        padding: 8
    },
    wantBtnActive: {
        backgroundColor: "#FF8C00", // لون برتقالي للإشارة للتفعيل
    },
    wantBtnText: {
        color: "white",
        textAlign: "center",
        fontSize: 24,
        fontWeight: "600"
    },
    playedBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#516996",
        borderRadius: 8,
        padding: 8
    },
    playedBtnActive: {
        backgroundColor: "#32CD32", // لون أخضر للإشارة للتفعيل
        borderColor: "#32CD32",
    },
    playedBtnText: {
        color: "white",
        textAlign: "center",
        fontSize: 24,
        fontWeight: "600"
    },
    details: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap"
    },
    textCard: {
        // marginRight: 25
        width: "50%"
    },
    detailsHeader: {
        color: "white",
        fontSize: 24,
        fontWeight: "600",
        textDecorationLine: "underline",
        marginTop: 10,
    },
    detailsText: {
        color: "#9f9f9f",
        fontSize: 20,
        fontWeight: "600",
        marginLeft: 3,
        flexWrap: "wrap"
    },
    summary: {
        color: "#c1c1c1",
        fontSize: 16,
        marginTop: 5
    },
    langs: {
        color: "#9f9f9f",
    },
    trailerContainer: {
        marginTop: 20
    },
    ytVid: {
        marginTop: 20,
    },
    similarCard: {
        width: 120,
        marginRight: 12,
        alignItems: "center",
    },
    similarImg: {
        width: 120,
        height: 160,
        borderRadius: 8,
        marginBottom: 6,
    },
    similarName: {
        color: "#cfcfcf",
        fontSize: 14,
        textAlign: "center",
    },
});
