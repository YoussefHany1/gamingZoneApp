import React, { useEffect, useState, useRef } from "react";
import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from '@env';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ImageBackground,
    ScrollView,
    TouchableOpacity,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import YoutubePlayer from "react-native-youtube-iframe";
import Loading from '../Loading'

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

async function fetchGameById(id) {
    if (!id) throw new Error("fetchGameById: missing id");
    const token = await getAppToken();
    const body = `
    fields id, name, cover.image_id, first_release_date, total_rating, total_rating_count, summary, hypes, platforms, collections, cover.url, dlcs, game_modes, game_status, game_type, genres, language_supports, multiplayer_modes, remakes, remasters, screenshots.image_id, storyline, release_dates.human, platforms.abbreviation, websites.type, websites.url, genres.name, game_modes.name, language_supports.language.name, language_supports.language_support_type.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_engines.name, videos.name, videos.video_id, collection.name, similar_games.name, similar_games.slug, similar_games.cover.image_id, collections.games.name, collections.games.cover.image_id;
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

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (initialGameID && initialGameID !== currentId) {
            setCurrentId(initialGameID);
        }
    }, [initialGameID]);

    useEffect(() => {
        if (!currentId) {
            setError("No game ID provided");
            setGame(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchGameById(currentId)
            .then((g) => {
                if (cancelled || !mountedRef.current) return;
                setGame(g);
                // بعد التحميل نزّح السكرول للفوق
                setTimeout(() => {
                    try {
                        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
                    } catch (e) { }
                }, 50);
            })
            .catch((err) => {
                console.error("fetchGameById error:", err);
                if (cancelled || !mountedRef.current) return;
                setError(err.message || "Failed to load game");
                setGame(null);
            })
            .finally(() => {
                if (cancelled || !mountedRef.current) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [currentId]);

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
                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
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
                    <Image
                        style={styles.image}
                        source={
                            game.cover?.image_id
                                ? { uri: `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.image_id}.jpg` }
                                : require("../assets/image-not-found.webp")
                        }
                    />
                    {/* {game.cover.image_id &&
                        images.push(`https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.image_id}.jpg`)
                    }
                    {game.screenshots &&
                        game.screenshots.map((shot) => (
                            // console.log(shot.image_id)
                            images.push(`https://images.igdb.com/igdb/image/upload/t_720p/${shot.image_id}.jpg`)
                        ))
                    } */}
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
                        {game.websites && <Text style={styles.storesHeader}>Available at these stores</Text>}
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
                            <TouchableOpacity style={styles.wantBtn}>
                                <Text style={styles.wantBtnText}>
                                    <Ionicons name="bookmark" size={20} color="white" /> Want
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.playedBtn}>
                                <Text style={styles.playedBtnText}>
                                    <Ionicons name="checkmark-sharp" size={24} color="white" /> Played
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View>
                            <Text style={styles.detailsHeader}>About</Text>
                            <Text style={styles.summary}>{game.summary}</Text>
                        </View>

                        <View style={styles.details}>
                            {/* generes section */}
                            {game.genres && (
                                <View style={styles.textCard}>
                                    <Text style={styles.detailsHeader}>Genres</Text>
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
                                    <Text style={styles.detailsHeader}>Game Modes</Text>
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
                                            <Text style={styles.detailsHeader}>Developer</Text>
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
                                            <Text style={styles.detailsHeader}>Publisher</Text>
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
                                        <Text style={styles.detailsHeader}>Language Supports</Text>
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
                                    <Text style={styles.detailsHeader}>Game Engines</Text>
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
                                                <Text style={styles.detailsHeader}>Game Trailer</Text>
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
                                <Text style={styles.detailsHeader}>collections Games</Text>
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
                                <Text style={styles.detailsHeader}>Similar Games</Text>
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
    closeButton: {
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
        // width: "100%",
    },
    title: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
        // lineHeight: 32,
        // textAlign: "center",
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
        // height: "100%",
        flexWrap: "wrap",
        flex: 1,
        // justifyContent: "flex-end"
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
        // backgroundColor: "#516996",
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
        borderColor: "gray",
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
