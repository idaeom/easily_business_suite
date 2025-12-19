import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { getExpenses, createExpense, uploadReceipt } from '@/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export default function ExpensesScreen() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newDesc, setNewDesc] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);

    const fetchExpenses = async () => {
        try {
            const data = await getExpenses();
            setExpenses(data);
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleCreateExpense = async () => {
        if (!newDesc.trim() || !newAmount.trim()) {
            Alert.alert('Error', 'Description and Amount are required');
            return;
        }

        try {
            await createExpense({
                description: newDesc,
                amount: parseFloat(newAmount)
            });
            setModalVisible(false);
            setNewDesc('');
            setNewAmount('');
            fetchExpenses(); // Refresh list
        } catch (error) {
            Alert.alert('Error', 'Failed to create expense');
        }
    };

    const handleUpload = async (expenseId: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setUploading(expenseId);
            await uploadReceipt(expenseId, result.assets[0]);
            Alert.alert('Success', 'Receipt uploaded successfully');
            fetchExpenses();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to upload receipt');
        } finally {
            setUploading(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.description}</Text>
                <View style={[styles.badge, item.status === 'APPROVED' ? styles.badgeApproved : styles.badgePending]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.amount}>NGN {Number(item.amount).toLocaleString()}</Text>
            <Text style={styles.cardMeta}>
                {item.requester?.name || 'Unknown'} • {new Date(item.createdAt).toLocaleDateString()}
            </Text>

            {item.status !== 'DISBURSED' && (
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => handleUpload(item.id)}
                    disabled={!!uploading}
                >
                    {uploading === item.id ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={16} color="#2563eb" />
                            <Text style={styles.uploadButtonText}>Upload Receipt</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.title}>Expenses</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={expenses}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchExpenses}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Request Expense</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Description (e.g. Server Costs)"
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Amount (NGN)"
                            value={newAmount}
                            onChangeText={setNewAmount}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonTextCancel}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.buttonSubmit]}
                                onPress={handleCreateExpense}
                            >
                                <Text style={styles.buttonTextSubmit}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    addButton: {
        backgroundColor: '#2563eb',
        padding: 8,
        borderRadius: 20,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        flex: 1,
    },
    amount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    cardMeta: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgePending: {
        backgroundColor: '#f1f5f9',
    },
    badgeApproved: {
        backgroundColor: '#dcfce7',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#475569',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        gap: 8,
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2563eb',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#0f172a',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    buttonCancel: {
        backgroundColor: '#f1f5f9',
    },
    buttonSubmit: {
        backgroundColor: '#2563eb',
    },
    buttonTextCancel: {
        color: '#64748b',
        fontWeight: '600',
    },
    buttonTextSubmit: {
        color: 'white',
        fontWeight: '600',
    },
});
