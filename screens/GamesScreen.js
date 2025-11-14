import { ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { EpicFreeGames } from 'epic-free-games';
import FreeGames from "../components/FreeGames";
import GamesList from "../components/GamesList";
import { Ionicons } from "@expo/vector-icons";
import Loading from '../Loading'

function GamesScreen() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // store the currently typed text
    const [submittedQuery, setSubmittedQuery] = useState(''); // save the text after clicking enter

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
    const handleSearchTextChange = (text) => {
        setSearchQuery(text);
        if (text === '') {
            setSubmittedQuery('');
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSubmittedQuery('');
    };
    // console.log(data)
    return (
        <>
            <SafeAreaView style={styles.container}>
                <ScrollView >
                    {loading ? (
                        <Loading />
                    ) : (
                        <View style={{ marginBottom: 60 }}>
                            <Text style={styles.header}>Find Your Next Gaming Adventure</Text>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchBar}
                                    placeholder="Search for games..."
                                    placeholderTextColor="#999"
                                    value={searchQuery}
                                    onChangeText={handleSearchTextChange}
                                    onSubmitEditing={() => setSubmittedQuery(searchQuery)} // Activate search when pressing enter
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity style={styles.clearTextBtn} onPress={handleClearSearch}>
                                        <Ionicons name="close-sharp" size={24} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {submittedQuery === '' ? (
                                <>
                                    {/* if search is empty show the defult lists */}
                                    <FreeGames data={data} />
                                    <GamesList endpoint="/popular" />
                                    <GamesList endpoint="/recently-released" />
                                    <GamesList endpoint="/top-rated" />
                                    <GamesList endpoint="/coming-soon" />
                                    <GamesList endpoint="/most-anticipated" />
                                </>
                            ) : (
                                // if search not empty show search results
                                <GamesList query={submittedQuery} />

                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

export default GamesScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0c1a33"
    },
    header: {
        color: "white",
        fontSize: 28,
        textAlign: "center",
        alignSelf: "center",
        fontWeight: "bold",
        backgroundColor: "#516996",
        paddingHorizontal: 15,
        paddingVertical: 8,
        margin: 30,
        marginTop: 10,
        borderRadius: 16
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        marginHorizontal: 10,
        marginBottom: 20,
        backgroundColor: "#1e2a45",
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 24,
        marginHorizontal: 50,
        borderWidth: 1,
        borderColor: "#516996",
    },
    searchBar: {
        color: "white",
        fontSize: 16,
        flex: 1
    },
    searchText: {
        color: 'white',
        fontSize: 18,
    },
});