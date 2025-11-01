import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView } from "react-native"
import { useState, useEffect } from "react"
function FreeGames({ data }) {
    const [game, setGame] = useState(data);
    // console.log(game.nextGames)

    const [timeLeft, setTimeLeft] = useState(getTimeUntilNextThursday());

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

    return (
        <>
            <View>
                <ScrollView horizontal={true} style={styles.container}>
                    {game.currentGames.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.gameCard} onPress={() => {
                            Linking.openURL(`https://store.epicgames.com/en-US/p/${item.offerMappings?.[index]?.pageSlug}`)
                        }}>
                            <Image source={
                                item.keyImages?.[2]?.url
                                    ? {
                                        uri: item.keyImages?.[2]?.url
                                    }
                                    : require("../assets/image-not-found.webp")
                            } style={styles.image} />
                            <Text style={styles.discout}>100%{"\n"}OFF</Text>
                            <Text style={styles.title}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                    {/* {<Text>        {days} يوم {hours.toString().padStart(2, "0")}:
                        {minutes.toString().padStart(2, "0")}:
                        {seconds.toString().padStart(2, "0")}</Text>} */}
                    {game.nextGames.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.gameCard} onPress={() => {
                            Linking.openURL(`https://store.epicgames.com/en-US/p/${item.offerMappings?.[index]?.pageSlug}`)
                        }}>
                            <View style={styles.overlay}>
                                <Text style={styles.subCount}>Free On</Text>
                                <View style={{ flexDirection: "row", justifyContent: "space-evenly", width: "100%" }}>
                                    <View>
                                        <Text style={styles.countdownNum}>Days</Text>
                                        <Text style={styles.countdownNum}>{days}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>Hrs</Text>
                                        <Text style={styles.countdownNum}>{hours}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>Min</Text>
                                        <Text style={styles.countdownNum}>{minutes}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.countdownNum}>Sec</Text>
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
                            } style={styles.image} />
                            <Text style={styles.discout}>100%{"\n"}OFF</Text>
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
    image: {
        width: 180,
        height: 180,
        borderRadius: 10,
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
        borderRadius: 16,
        padding: 7,
        top: 0,
        right: 0,
        fontSize: 16,
        fontWeight: "bold",
    },
});