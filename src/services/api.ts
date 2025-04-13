import axios from 'axios';
import {Student} from "../pages/MyStudentsPage";
import { NotificationMessage} from "../context/NotificationsSocketContext";

const api = axios.create({
    baseURL: 'http://localhost',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface GetUsersResponse {
    content: Student[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number; // current page
}

export const fetchNotifications = async (userId: string): Promise<NotificationMessage[]> => {
    const response = await api.get(`/notifications-service/api/notifications/user/${userId}`);
    return response.data;
};

export const markNotificationAsRead = async (id: string) => {
    return api.patch(`/notifications-service/api/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (userId: string) => {
    return api.patch(`/notifications-service/api/notifications/user/${userId}/read`);
};

export const deleteNotificationById = async (id: string) => {
    return api.delete(`/notifications-service/api/notifications/${id}`);
};

export const clearAllNotifications = async (userId: string) => {
    return api.delete(`/notifications-service/api/notifications/user/${userId}/clear`);
};

export const getUpcomingLessons = async (tutorId: string, studentId: string) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    params.append("status", "SCHEDULED,RESCHEDULED");

    const response = await api.get(`/lessons-service/api/lessons?${params}`);
    return response.data.content;
};

export const getHistoryLessons = async (userId: string) => {
    const response = await api.get(`/lessons-service/api/lessons?tutorId=${userId}&status=COMPLETED`);
    return response.data.content;
};

export const getLessons = async (studentId: string, tutorId: string, status: string, page = 0, size = 10) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    if (status) params.append("status", status);
    params.append("page", page.toString());
    params.append("size", size.toString());

    const response = await api.get(`/lessons-service/api/lessons?${params}`);
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

export const updateUserProfile = async (
    username: string,
    name: string,
    email: string,
    avatarFile?: File | null
) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    const response = await api.patch(`/users-service/api/users/profile?username=${username}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
};

export const fetchStudents = async (
    userId: string,
    search: string,
    page: number,
    size: number
): Promise<GetUsersResponse> => {
    const response = await api.get(`/users-service/api/users/teacher/${userId}/students`, {
        params: {
            search,
            page,
            size,
        },
    });

    return response.data;
};

export const createStudent = async (teacherMail: string, studentData: { name: string; email: string; level: string }) => {
    const response = await api.post(`/users-service/api/students?teacherEmail=${teacherMail}`, {
        ...studentData,
        teacherMail,
    });
    return response.data;
};

export const createLesson = async (lessonData: any) => {
    const response = await api.post("/lessons-service/api/lessons", lessonData);
    return response.data;
}

export const getLessonById = async (lessonId: string) => {
    const response = await api.get(`/lessons-service/api/lessons/${lessonId}`);
    return response.data;
}

export const updateLesson = async (lessonId: string, lessonData: any) => {
    const response = await api.patch(`/lessons-service/api/lessons/${lessonId}`, lessonData);
    return response.data;
}

export const deleteLesson = async (lessonId: string) => {
    const res = await api.delete(`lessons-service/api/lessons/${lessonId}`);
    return res.data;
};

export const fetchUserById = async (userId: string) => {
    const response = await api.get(`users-service/api/users/${userId}`);
    return response.data;
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

export default api;