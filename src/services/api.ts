import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getUpcomingLessons = async (userId: string) => {
    const response = await api.get(`/lessons-service/api/lessons?userId=${userId}&status=SCHEDULED`);
    return response.data;
};

export const getHistoryLessons = async (userId: string) => {
    const response = await api.get(`/lessons-service/api/lessons?userId=${userId}&status=COMPLETED`);
    return response.data;
};

export const fetchCurrentUser = async () => {
    const response = await api.get(`/users-service/api/users/me`);
    return response.data;
}

export const updateCurrentUser = async (userId: string, data: Partial<any>) => {
    const response = await api.patch(`/users-service/api/users/${userId}`, data);
    return response.data;
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

export default api;