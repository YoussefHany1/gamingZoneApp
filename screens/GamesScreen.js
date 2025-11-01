import { View, Text, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { EpicFreeGames } from 'epic-free-games';
import FreeGames from "../components/FreeGames";



function GamesScreen() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const epicFreeGames = new EpicFreeGames({
            country: "US",
            locale: "en-US",
            includeAll: true,
        });

        epicFreeGames
            .getGames()
            .then((res) => {
                setData(res);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching games:", err);
                setLoading(false);
            });
    }, []);
    // console.log(data)
    return (
        <>
            <View style={styles.container}>
                <Text style={styles.header}>Get your free weekly game from Epic Games</Text>
                {loading ? (
                    <Text style={{ color: 'white', textAlign: 'center' }}>Loading...</Text>
                ) : (
                    <FreeGames data={data} />
                )}
            </View>
        </>
    );
}
export default GamesScreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0c1a33",
        paddingTop: 70,
    },
    header: {
        color: "white",
        // textAlign: "center"
        fontSize: 24,
        marginRight: 50,
        fontWeight: 500,
        marginLeft: 10,
        marginBottom: 10
    }
});