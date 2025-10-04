import axios from 'axios';
import { resolveUrl } from './assets';
import { Student } from "../features/students/types";
import { NotificationMessage} from "../context/NotificationsSocketContext";
import { ApiError } from '../context/ApiErrorContext';
import {
    GenerateExerciseRequest,
    GenerateExerciseResponse,
    GenerateListeningTranscriptPayload,
    ListeningTranscriptResponse,
    ListeningAudioJobStartResponse,
    ListeningAudioJobStatusResponse,
    ListeningVoice,
    StartListeningAudioJobPayload,
    ValidateListeningTranscriptPayload,
    ValidateListeningTranscriptResponse,
    UpdateListeningTranscriptPayload,
} from "../types";
import { LESSON_CONTENTS_BASE } from '../constants/api';
import type { PageModel, BlockContentPayload } from '../types/lessonContent';

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
    params.append("status", "SCHEDULED,RESCHEDULED,IN_PROGRESS");

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
    id: string,
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

    const response = await api.patch(`/users-service/api/users/profile?id=${id}`, formData, {
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

export const createStudent = async (
  teacherMail: string,
  studentData: { name: string; email?: string; level: string }
) => {
  const response = await api.post(`/users-service/api/students?teacherEmail=${teacherMail}`,[
    {
      ...studentData,
      teacherMail,
    }
  ].length === 1 ? { ...studentData, teacherMail } : { ...studentData, teacherMail });
  // Return created student (expects backend to return created entity)
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

// Legacy API functions - deprecated
/**
 * @deprecated Use deleteListeningTask instead
 */
export const deleteGlobalListeningTask = async (taskId: string) => {
    const response = await api.delete(`/lessons-service/api/listening-tasks/${taskId}`);
    return response.data;
}

/**
 * @deprecated Use fetchListeningTasks instead
 */
export const getAllListeningTasks = async () => {
    const response = await api.get(`/lessons-service/api/listening-tasks`);
    return response.data;
}

/**
 * @deprecated Use fetchListeningTasks instead
 */
export const geListeningTasks = async (folderId: string) => {
  const query = folderId ? `?folderId=${folderId}` : '';
  const response = await api.get(`/lessons-service/api/listening-tasks${query}`);
  return response.data;
}

/**
 * @deprecated Use createListeningTask instead
 */
export const createGlobalListeningTask = async (taskData: {
  assetType: string;
  sourceUrl: string;
  folderId?: string;
  startSec: number;
  endSec: number;
  wordLimit?: number;
  timeLimitSec?: number;
  title?: string;
}) => {
  const response = await api.post(`/lessons-service/api/listening-tasks`, taskData);
  return response.data;
}

// New API functions for materials
export const createMaterial = async (materialData: {
  title: string;
  type: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  tags?: string[];
  folderId?: string;
}) => {
  const response = await api.post(`/lessons-service/api/materials`, materialData);
  return response.data;
};

export const updateMaterial = async (id: string, materialData: {
  title?: string;
  type?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  tags?: string[];
  folderId?: string;
}) => {
  const response = await api.patch(`/lessons-service/api/materials/${id}`, materialData);
  return response.data;
};

export const deleteMaterial = async (id: string) => {
  const response = await api.delete(`/lessons-service/api/materials/${id}`);
  return response.data;
};

// New API functions for listening tasks
export const fetchListeningTasks = async (materialId: string) => {
  const response = await api.get(`/lessons-service/api/materials/${materialId}/tasks`);
  return response.data;
};

export const createListeningTask = async (materialId: string, taskData: {
  title?: string;
  startSec: number;
  endSec: number;
  wordLimit?: number;
  timeLimitSec?: number;
}) => {
  const response = await api.post(`/lessons-service/api/materials/${materialId}/tasks`, taskData);
  return response.data;
};

export const updateListeningTask = async (materialId: string, taskId: string, taskData: {
  title?: string;
  startSec?: number;
  endSec?: number;
  wordLimit?: number;
  timeLimitSec?: number;
}) => {
  const response = await api.patch(`/lessons-service/api/materials/${materialId}/tasks/${taskId}`, taskData);
  return response.data;
};

export const deleteListeningTask = async (materialId: string, taskId: string) => {
  const response = await api.delete(`/lessons-service/api/materials/${materialId}/tasks/${taskId}`);
  return response.data;
};

// Lesson Contents API
export const getLessonContents = async (params: { ownerId?: string; q?: string; tags?: string[]; status?: 'DRAFT' | 'PUBLISHED'; page?: number; size?: number; }) => {
  const queryParams = new URLSearchParams();
  if (params.ownerId) queryParams.append('ownerId', params.ownerId);
  if (params.q) queryParams.append('q', params.q);
  if (params.status) queryParams.append('status', params.status);
  if (params.page !== undefined) queryParams.append('page', String(params.page));
  if (params.size !== undefined) queryParams.append('size', String(params.size));
  if (params.tags && params.tags.length) params.tags.forEach(t => queryParams.append('tags', t));
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await api.get(`${LESSON_CONTENTS_BASE}${query}`);
  return response.data;
};

export const getLessonContent = async (id: string) => {
  const response = await api.get(`${LESSON_CONTENTS_BASE}/${id}`);
  return response.data;
};

export const createLessonContent = async (payload: { ownerId: string; title?: string; tags?: string[]; layout: PageModel; content: Record<string, BlockContentPayload>; }) => {
  const response = await api.post(`${LESSON_CONTENTS_BASE}`, payload);
  return response.data;
};

export const updateLessonContent = async (id: string, payload: { title?: string; tags?: string[]; layout: PageModel; content: Record<string, BlockContentPayload>; updatedAt?: string; }) => {
  const response = await api.put(`${LESSON_CONTENTS_BASE}/${id}`, payload);
  return response.data;
};

export const publishLessonContent = async (id: string) => {
  const response = await api.post(`${LESSON_CONTENTS_BASE}/${id}/publish`);
  return response.data;
};

export const unpublishLessonContent = async (id: string) => {
  const response = await api.post(`${LESSON_CONTENTS_BASE}/${id}/unpublish`);
  return response.data;
};

export const deleteLessonContent = async (id: string) => {
  const response = await api.delete(`${LESSON_CONTENTS_BASE}/${id}`);
  return response.data;
};

export const getMaterialFolders = async () => {
  const response = await api.get(`/lessons-service/api/material-folders`);
  return response.data;
};

export const getMaterialFoldersByParent = async (parentId?: string) => {
  const query = parentId ? `?parentId=${parentId}` : '';
  const response = await api.get(`/lessons-service/api/material-folders${query}`);
  return response.data;
};

export const getMaterialFolderTree = async () => {
  const response = await api.get(`/lessons-service/api/material-folders/tree`);
  return response.data;
};

export const createMaterialFolder = async (folderData: { name: string, parentId?: string }) => {
  const response = await api.post(`/lessons-service/api/material-folders`, folderData);
  return response.data;
};

export const updateMaterialFolder = async (id: string, folderData: { name: string, parentId?: string }) => {
  const response = await api.patch(`/lessons-service/api/material-folders/${id}`, folderData);
  return response.data;
};

export const deleteMaterialFolder = async (id: string) => {
  const response = await api.delete(`/lessons-service/api/material-folders/${id}`);
  return response.data;
};

// Fetch single material by id
export const getMaterial = async (id: string) => {
  const response = await api.get(`/lessons-service/api/materials/${id}`);
  return response.data;
};

export const getMaterials = async (params: {
  folderId?: string;
  page?: number;
  size?: number;
  search?: string;
  type?: string;
  tags?: string[];
}) => {
  const queryParams = new URLSearchParams();

  if (params.folderId) queryParams.append('folderId', params.folderId);
  if (params.page !== undefined) queryParams.append('page', params.page.toString());
  if (params.size !== undefined) queryParams.append('size', params.size.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.type) queryParams.append('type', params.type);
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach(tag => queryParams.append('tags', tag));
  }

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await api.get(`/lessons-service/api/materials${query}`);
  return response.data;
};

// Legacy method for removing tasks from lessons
export const removeTaskFromLesson = async (lessonId: string, taskId: string) => {
  const response = await api.delete(`/lessons-service/api/lessons/${lessonId}/tasks/${taskId}`);
  return response.data;
}

export const getMaterialTags = async () => {
  const response = await api.get(`/lessons-service/api/materials/tags`);
  return response.data;
}

// Lesson ↔ Material
export const fetchLessonMaterials = async (lessonId:string) =>
  api.get(`/lessons-service/api/lessons/${lessonId}/materials`).then(r=>r.data);

export const linkMaterialToLesson = (lessonId:string, materialId:string) =>
  api.post(`/lessons-service/api/lessons/${lessonId}/materials`, null,{ params:{ materialId }});

export const unlinkMaterialFromLesson = (lessonId:string, linkId:string) =>
  api.delete(`/lessons-service/api/lessons/${lessonId}/materials/${linkId}`);

export const reorderLessonMaterial = (
  lessonId:string, linkId:string, sortOrder:number
) =>
  api.patch(`/lessons-service/api/lessons/${lessonId}/materials/${linkId}`, { sortOrder });

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

// Grammar items
export interface GrammarItemDto {
  id: string;
  sortOrder: number;
  type: 'GAP_FILL';      // room for future
  text: string;          // contains {{1}} etc.
  metadata?: string;     // JSON string
  answer: string;        // canonical answers list
}

// GET all items for a material
export const fetchGrammarItems = (materialId: string) =>
  api.get<GrammarItemDto[]>(`/lessons-service/api/materials/${materialId}/grammar-items`)
     .then(r => r.data);

// POST score request/response
export interface GrammarScoreRequest {
  attempts: {
    grammarItemId: string;
    gapAnswers: string[];
  }[];
}

export interface GrammarScoreResponse {
  materialId: string;
  totalItems: number;
  correctItems: number;
  totalGaps: number;
  correctGaps: number;
  details: {
    grammarItemId: string;
    gapResults: {
      index: number;
      student: string;
      correct: string;
      isCorrect: boolean;
    }[];
    itemCorrect: boolean;
  }[];
}

export const scoreGrammar = (
  materialId: string,
  payload: GrammarScoreRequest
) =>
  api.post<GrammarScoreResponse>(
    `/lessons-service/api/materials/${materialId}/score`,
    payload
  ).then(r => r.data);

// Create a grammar item for a material
export const createGrammarItem = (
  materialId: string,
  item: Omit<GrammarItemDto, 'id'>
) =>
  api.post<GrammarItemDto>(
    `/lessons-service/api/materials/${materialId}/grammar-items`,
    item
  ).then(r => r.data);


export const generateAiExercise = async (payload: GenerateExerciseRequest): Promise<GenerateExerciseResponse> => {
    const response = await api.post(`/lessons-service/api/ai/exercises`, payload);
    return response.data;
};

// Onboarding magic-link APIs
export const generateMagicLink = async (studentId: string): Promise<{ link: string }> => {
  const response = await api.post(`/users-service/api/onboarding/generate-link`, { studentId });
  return response.data;
};

export const validateOnboardingToken = async (
  token: string
): Promise<{ valid: boolean; username?: string; displayName?: string }> => {
  const response = await api.get(`/users-service/api/onboarding/validate`, {
    params: { token },
  });
  return response.data;
};

export const consumeOnboardingToken = async (
  token: string,
  newPassword: string,
  username: string,
): Promise<void> => {
  await api.post(`/users-service/api/onboarding/consume`, { token, password: newPassword, username });
};

// Diagnostics: microphone/logs
export interface MicDiagPayload {
  ts: string;
  event: string;
  room?: string;
  identity?: string;
  userRole?: string;
  ua?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}

export const postMicDiag = async (payload: MicDiagPayload) => {
  const res = await api.post(`/users-service/api/diag/mic-log`, payload);
  return res.data;
};

export const generateListeningTranscript = async (
  teacherId: string,
  payload: GenerateListeningTranscriptPayload,
): Promise<ListeningTranscriptResponse> => {
  const response = await api.post<ListeningTranscriptResponse>(
    `/lessons-service/api/listening/transcripts/generate`,
    payload,
    { params: { teacherId } },
  );
  return response.data;
};

export const updateListeningTranscript = async (
  teacherId: string,
  transcriptId: string,
  payload: UpdateListeningTranscriptPayload,
): Promise<ListeningTranscriptResponse> => {
  const response = await api.put<ListeningTranscriptResponse>(
    `/lessons-service/api/listening/transcripts/${transcriptId}`,
    payload,
    { params: { teacherId } },
  );
  return response.data;
};

export const getListeningTranscript = async (
  teacherId: string,
  transcriptId: string,
): Promise<ListeningTranscriptResponse> => {
  const response = await api.get<ListeningTranscriptResponse>(
    `/lessons-service/api/listening/transcripts/${transcriptId}`,
    { params: { teacherId } },
  );
  return response.data;
};

export const validateListeningTranscript = async (
  payload: ValidateListeningTranscriptPayload,
): Promise<ValidateListeningTranscriptResponse> => {
  const response = await api.post<ValidateListeningTranscriptResponse>(
    `/lessons-service/api/listening/transcripts/validate`,
    payload,
  );
  return response.data;
};

export const listListeningVoices = async (): Promise<ListeningVoice[]> => {
  const response = await api.get<ListeningVoice[]>(`/lessons-service/api/listening/voices`);
  return response.data;
};

export const startListeningAudioGeneration = async (
  teacherId: string,
  payload: StartListeningAudioJobPayload,
  token: string,
  idempotencyKey: string,
): Promise<ListeningAudioJobStartResponse> => {
  const response = await api.post<ListeningAudioJobStartResponse>(
    `lessons-service/api/listening/audio/generate`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      params: { teacherId },
    },
  );
  return response.data;
};

export const getListeningAudioJobStatus = async (
  jobId: string,
): Promise<ListeningAudioJobStatusResponse> => {
  const response = await api.get<ListeningAudioJobStatusResponse>(
    `lessons-service/api/listening/audio/jobs/${jobId}`,
  );
  const data = response.data;
  // Normalize audioUrl using shared resolver (env-aware)
  if (data && typeof data.audioUrl === 'string' && data.audioUrl) {
    data.audioUrl = resolveUrl(data.audioUrl);
  }
  return data;
};

export default api;
