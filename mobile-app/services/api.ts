import axios from 'axios';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
// For physical devices, replace with your machine's LAN IP (e.g., 192.168.1.x)
const BASE_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/mobile-login', data);
    return response.data;
};

export const getDashboardMetrics = async () => {
    const response = await api.get('/dashboard');
    return response.data;
};

export const getTasks = async () => {
    const response = await api.get('/tasks');
    return response.data;
};

export const createTask = async (data: { title: string; description?: string }) => {
    const response = await api.post('/tasks', data);
    return response.data;
};

export const getExpenses = async () => {
    const response = await api.get('/expenses');
    return response.data;
};

export const createExpense = async (data: { description: string; amount: number }) => {
    const response = await api.post('/expenses', data);
    return response.data;
};

export const uploadReceipt = async (expenseId: string, file: any) => {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
    } as any);

    const response = await api.post(`/expenses/${expenseId}/receipt`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default api;
