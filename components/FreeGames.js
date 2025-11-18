import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView } from "react-native"
import { useState, useEffect } from "react"
import { EpicFreeGames } from 'epic-free-games';
import Loading from "../Loading";
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'EPIC_GAMES_CACHE';
function FreeGames() {
    const { t } = useTranslation();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(getTimeUntilNextThursday());
    useEffect(() => {
        loadGames();
    }, []);
    const loadGames = async () => {
        // 1. استراتيجية الكاش أولاً (عرض فوري)
        try {
            const cachedString = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedString) {
                console.log("📦 Showing Cached Games immediately");
                const cachedObject = JSON.parse(cachedString);
                setGame(cachedObject.data);
                setLoading(false); // إخفاء اللودينج لأن البيانات ظهرت
            }
        } catch (error) {
            console.error("Cache loading error:", error);
        }

        // 2. جلب البيانات الجديدة من الـ API في الخلفية (Sync)
        try {
            const epicFreeGames = new EpicFreeGames({
                country: "US",
                locale: "en-US",
                includeAll: true,
            });

            const res = await epicFreeGames.getGames();

            // تحديث الواجهة بالبيانات الحقيقية
            console.log("🔥 API update received - Syncing...");
            setGame(res);
            setLoading(false);

            // حفظ البيانات الجديدة في الكاش للمرات القادمة
            const dataToSave = {
                data: res,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));

        } catch (err) {
            console.error("Error fetching games from API:", err);
            // في حالة الفشل، لو مفيش كاش أصلاً، نوقف اللودينج عشان ميفضلش يلف
            if (!game) {
                setLoading(false);
            }
        }
    };



    useEffect(() => {
        const timer = setInterval(() => {
            const newTime = getTimeUntilNextThursday();
            setTimeLeft(newTime);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    function getTimeUntilNextThursday() {
        const now = new Date();
        const nextThursday = new Date();

        // الخميس = 4 (الأيام تبدأ من 0 = الأحد)
        const dayOfWeek = now.getDay();
        let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
        if (daysUntilThursday === 0 && now.getHours() >= 17) {
            // لو النهارده خميس وعدت الساعة 5، روح الخميس الجاي
            daysUntilThursday = 7;
        }

        nextThursday.setDate(now.getDate() + daysUntilThursday);
        nextThursday.setHours(17, 0, 0, 0); // الساعة 5:00 مساءً

        const diff = nextThursday - now; // فرق بالمللي ثانية
        return diff > 0 ? diff : 0;
    }

    // نحول الفرق إلى ساعات ودقايق وثواني
    const seconds = Math.floor((timeLeft / 1000) % 60);
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    // console.log(game)
    return (
        <>
            <View>
                {loading &&
                    <Loading />
                }
                <Text style={styles.header}>{t('games.freeGames.header')}</Text>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.container}>
                    {game?.currentGames?.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.gameCard} onPress={() => {
                            Linking.openURL(`https://store.epicgames.com/en-US/p/${item.offerMappings?.[index]?.pageSlug}`)
                        }}>
                            <Image source={
                                item.keyImages?.[2]?.url
                                    ? {
                                        uri: item.keyImages?.[2]?.url
                                    }
                                    : require("../assets/image-not-found.webp")
                            } style={styles.cover} resizeMode="cover" />
                            <Text style={styles.discout}>{t('games.freeGames.discount')}</Text>
                            <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                    {game?.nextGames?.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.gameCard} onPress={() => {
                            Linking.openURL(`https://store.epicgames.com/en-US/p/${item.offerMappings?.[index]?.pageSlug}`)
                        }}>
                            <View style={styles.overlay}>
                                <Text style={styles.subCount}>{t('games.freeGames.freeOn')}</Text>
                                <View style={{ flexDirection: "row", justifyContent: "space-evenly", width: "100%" }}>
                                    <View>
                                        <Text style={styles.countdownNum}>{t('games.freeGames.days')}</Text>
                                        <Text style={styles.countdownNum}>{days}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>{t('games.freeGames.hours')}</Text>
                                        <Text style={styles.countdownNum}>{hours}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>{t('games.freeGames.minutes')}</Text>
                                        <Text style={styles.countdownNum}>{minutes}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>{t('games.freeGames.seconds')}</Text>
                                        <Text style={styles.countdownNum}>{seconds}</Text>
                                    </View>
                                </View>

                            </View>
                            <Image source={
                                item.keyImages?.[2]?.url
                                    ? {
                                        uri: item.keyImages?.[2]?.url
                                    }
                                    : require("../assets/image-not-found.webp")
                            } style={styles.cover} resizeMode="cover" />
                            <Text style={styles.title}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </>
    )
}
export default FreeGames

const styles = StyleSheet.create({
    container: {
        // flexDirection: "row"
    },
    header: { fontSize: 28, color: 'white', margin: 12, fontWeight: 'bold', },
    overlay: {
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    countdownNum: {
        color: "white",
        textAlign: "center",
        margin: 5,
        fontSize: 18,
        fontWeight: "900"
    },
    subCount: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold"
    },
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
        backgroundColor: "#516996"
    },
    title: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 10,
        textAlign: "center",
        width: 150
    },
    discout: {
        color: "white",
        backgroundColor: "#516996",
        position: "absolute",
        textAlign: "center",
        borderBottomLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 7,
        top: 0,
        right: 0,
        fontSize: 16,
        fontWeight: "bold",
    },
});