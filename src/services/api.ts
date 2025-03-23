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

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

export default api;