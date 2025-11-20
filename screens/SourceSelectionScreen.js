// screens/SourceSelectionScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
// استيراد الـ hook وقائمة المصادر
// import useUserPreferences, { ALL_SOURCES } from '../hooks/useUserPreferences';

function SourceSelectionScreen({ navigation }) {
    const { t } = useTranslation();
    const { selectedSourceIds, loading, updateSelectedSources } = useUserPreferences();
    // حالة مؤقتة لحفظ التحديدات قبل الحفظ النهائي
    const [tempSelectedSources, setTempSelectedSources] = useState([]);

    useEffect(() => {
        // عند الانتهاء من التحميل، يتم ملء الحالة المؤقتة بالتفضيلات الحالية
        if (!loading) {
            setTempSelectedSources(selectedSourceIds);
        }
    }, [selectedSourceIds, loading]);

    const toggleSource = (sourceId) => {
        setTempSelectedSources(current => {
            if (current.includes(sourceId)) {
                // منع إلغاء تحديد آخر مصدر
                if (current.length > 1) {
                    return current.filter(id => id !== sourceId);
                }
                Alert.alert(
                    t('settings.newsSources.alertTitle'),
                    t('settings.newsSources.alertMessage') // يجب إضافة هذه الترجمة
                );
                return current;
            } else {
                return [...current, sourceId];
            }
        });
    };

    const handleSave = () => {
        updateSelectedSources(tempSelectedSources);
        navigation.goBack();
    };

    const renderSourceItem = ({ item }) => {
        const isSelected = tempSelectedSources.includes(item.id);
        const disableToggle = isSelected && tempSelectedSources.length === 1;

        return (
            <TouchableOpacity
                style={styles.sourceItem}
                onPress={() => toggleSource(item.id)}
                disabled={disableToggle}
            >
                <Text style={styles.sourceLabel}>{item.label}</Text>
                <Ionicons
                    name={isSelected ? "checkbox-outline" : "square-outline"}
                    size={24}
                    color={disableToggle ? "#555" : (isSelected ? "#779bdd" : "#fff")}
                />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerTitle}>{t('settings.menu.newsSources')}</Text>
            <Text style={styles.subtitle}>{t('settings.newsSources.subtitle')}</Text>
            <FlatList
                data={ALL_SOURCES}
                renderItem={renderSourceItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0c1a33",
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginVertical: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 20,
    },
    sourceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginVertical: 5,
        backgroundColor: 'rgba(119, 155, 221, 0.2)',
        borderRadius: 8,
    },
    sourceLabel: {
        color: '#fff',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#779bdd',
        padding: 15,
        borderRadius: 10,
        marginVertical: 20,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingText: {
        color: '#fff',
        textAlign: 'center',
        marginTop: 50,
    }
});

export default SourceSelectionScreen;