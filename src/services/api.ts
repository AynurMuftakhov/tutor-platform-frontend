import { keycloak } from './keycloak';
import axios from 'axios';
import {Student} from "../pages/MyStudentsPage";
import { NotificationMessage} from "../context/NotificationsSocketContext";
import { ApiError } from '../context/ApiErrorContext';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
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

export const getUpcomingLessons = async (tutorId: string, studentId: string, currentDate: string) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    if (currentDate) params.append("currentDate", currentDate);
    params.append("status", "SCHEDULED,RESCHEDULED");

    const response = await api.get(`/lessons-service/api/lessons/upcoming?${params}`);
    return response.data;
};

export const getLessons = async (
    studentId: string,
    tutorId: string,
    status: string,
    startDate: string,
    endDate: string
) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    if (status) params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(`/lessons-service/api/lessons?${params}`);
    return response.data;
};

export interface LessonCountsByDay {
    [date: string]: number; // Format: "YYYY-MM-DD" -> count
}

export const getLessonCountsByMonth = async (
    year: number,
    month: number, // 1-12
    studentId?: string,
    tutorId?: string
): Promise<LessonCountsByDay> => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    params.append("year", year.toString());
    params.append("month", month.toString());

    const response = await api.get(`/lessons-service/api/lessons/month-counts?${params}`);
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

export const getCurrentLesson = async (tutorId: string, studentId: string, currentDate: string) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (studentId) params.append("studentId", studentId);
    if (currentDate) params.append("currentDate", currentDate);
    const response = await api.get(`/lessons-service/api/lessons/now?${params}`);
    return response.data;
}

export const fetchMyTutorLessons = async (tutorId: string, startDate: string, endDate: string) => {
    const params = new URLSearchParams();
    if (tutorId) params.append("tutorId", tutorId);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const response = await api.get(`/lessons-service/api/lessons/mytutor/schedule?${params}`);
    return response.data;
}

export const getTeacherByStudentId = async (studentId: string) => {
    const response = await api.get(`/users-service/api/students/${studentId}/teacher`);
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

export const getTutorStatistics = async (tutorId: string) => {
    const response = await api.get(`/lessons-service/api/lessons/tutor/${tutorId}/statistics`);
    return response.data;
};

export const fetchUserById = async (userId: string) => {
    const response = await api.get(`users-service/api/users/${userId}`);
    return response.data;
}

export const deleteUser = async (userId: string) => {
    const response = await api.delete(`/users-service/api/users/${userId}`);
    return response.data;
}

export const resetPasswordEmail = async (email: string) => {
    const response = await api.post(`/users-service/api/students/email/resend?email=${email}`);
    return response.data;
}

export const fetchLiveKitToken = async (identity: string, roomName: string, username: string) => {
    const response = await api.get(`video-service/api/video/token?identity=${identity}&roomName=${roomName}&username=${username}`);
    return response.data;
}

export const getLessonTasks = async (lessonId: string) => {
  const response = await api.get(`/lessons-service/api/lessons/${lessonId}/tasks`);
  return response.data;
}

export const deleteGlobalListeningTask = async (taskId: string) => {
    const response = await api.delete(`/lessons-service/api/listening-tasks/${taskId}`);
    return response.data;
}

export const getAllListeningTasks = async () => {
  const response = await api.get(`/lessons-service/api/listening-tasks`);
  return response.data;
}

export const createGlobalListeningTask = async (taskData: {
  assetType: string;
  sourceUrl: string;
  startSec: number;
  endSec: number;
  wordLimit?: number;
  timeLimitSec?: number;
  title?: string;
}) => {
  const response = await api.post(`/lessons-service/api/listening-tasks`, taskData);
  return response.data;
}

// New methods for lesson task management
export const assignTaskToLesson = async (lessonId: string, taskId: string) => {
  const response = await api.post(`/lessons-service/api/lessons/${lessonId}/tasks?taskId=${taskId}`);
  return response.data;
}

export const removeTaskFromLesson = async (lessonId: string, taskId: string) => {
  const response = await api.delete(`/lessons-service/api/lessons/${lessonId}/tasks/${taskId}`);
  return response.data;
}

// Request interceptor to add authorization token
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global error handler function - will be set by ApiErrorProvider
let handleApiError: ((error: ApiError) => void) | null = null;

// Function to set the error handler
export const setApiErrorHandler = (handler: (error: ApiError) => void) => {
    handleApiError = handler;
};

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response, // Return successful responses as-is
    (error) => {
        // Check if the error has a response from the server
        if (error.response && error.response.data) {
            const { data } = error.response;

            // Check if the response matches our expected error format
            if (data.timestamp && data.status && data.error && data.message && data.path) {
                const apiError: ApiError = {
                    timestamp: data.timestamp,
                    status: data.status,
                    error: data.error,
                    message: data.message,
                    path: data.path
                };

                // If we have an error handler, call it
                if (handleApiError) {
                    handleApiError(apiError);
                }
            }
        }

        // Always reject the promise so the calling code can handle the error if needed
        return Promise.reject(error);
    }
);

export default api;
