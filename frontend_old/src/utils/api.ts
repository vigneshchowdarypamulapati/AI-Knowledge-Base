import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

// Attach auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Redirect to login on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// ── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
    register: (data: { email: string; password: string; name: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    resetPassword: (data: { email: string; newPassword: string }) =>
        api.post('/auth/reset-password', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data: { name: string }) =>
        api.put('/auth/profile', data),
    updateSettings: (data: {
        topK?: number;
        similarityThreshold?: number;
        useHyDE?: boolean;
        streamingEnabled?: boolean;
        model?: string;
    }) => api.put('/auth/settings', data)
};

// ── Documents API ───────────────────────────────────────────────────────────
export const documentAPI = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000
        });
    },
    getAll: () => api.get('/documents'),
    getOne: (id: string) => api.get(`/documents/${id}`),
    reprocess: (id: string) => api.post(`/documents/${id}/reprocess`),
    delete: (id: string) => api.delete(`/documents/${id}`),
    getStats: () => api.get('/documents/stats')
};

// Legacy alias kept for backwards compatibility with DocumentContext
export const documentsAPI = documentAPI;

// ── Chat API ────────────────────────────────────────────────────────────────
export const chatAPI = {
    query: (data: { question: string; documentIds?: string[]; chatId?: string }) =>
        api.post('/chat/query', data),
    create: (data: { title?: string; documentIds?: string[] }) =>
        api.post('/chat', data),
    getAll: () => api.get('/chat'),
    getOne: (id: string) => api.get(`/chat/${id}`),
    update: (id: string, data: { title: string }) =>
        api.patch(`/chat/${id}`, data),
    delete: (id: string) => api.delete(`/chat/${id}`),
    getStats: () => api.get('/chat/stats')
};
