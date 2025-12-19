import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// We would add an API call to get single task here, but for now we'll just show params
// or fetch if we had the endpoint ready. We do have getTask in backend but not in mobile api.

export default function TaskDetailsScreen() {
    const { id, title, description, status } = useLocalSearchParams();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <View style={[styles.badge, status === 'DONE' ? styles.badgeDone : styles.badgePending]}>
                    <Text style={styles.badgeText}>{status}</Text>
                </View>

                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{description || 'No description provided.'}</Text>

                <Text style={styles.sectionTitle}>ID</Text>
                <Text style={styles.meta}>{id}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 16,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 24,
    },
    badgePending: {
        backgroundColor: '#f1f5f9',
    },
    badgeDone: {
        backgroundColor: '#dcfce7',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginTop: 16,
    },
    description: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
    },
    meta: {
        fontSize: 14,
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
});
