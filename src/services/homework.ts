import { AssignmentDto, CreateAssignmentDto, PageResult, UpdateProgressPayload } from '../types/homework';
import api from './api';

// Endpoints base: prefer env override, fallback to service prefix
const HOMEWORKS_BASE = (import.meta as any).env?.VITE_HOMEWORKS_BASE || '/homework-service/api/homeworks';

export const getStudentHomeworks = (studentId: string, pageable?: { page?: number; size?: number }) =>
  api.get<PageResult<AssignmentDto>>(`${HOMEWORKS_BASE}/${studentId}`, { params: pageable }).then(r => r.data);

export const getTutorHomeworks = (tutorId: string, studentId?: string, pageable?: { page?: number; size?: number }) =>
  api.get<PageResult<AssignmentDto>>(`${HOMEWORKS_BASE}/tutor/${tutorId}`, { params: { ...(studentId ? { studentId } : {}), ...(pageable || {}) } }).then(r => r.data);

export const createHomework = (teacherId: string, payload: CreateAssignmentDto) =>
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}`, payload, { params: { teacherId } }).then(r => r.data);

export const deleteHomework = (assignmentId: string) =>
  api.delete<void>(`${HOMEWORKS_BASE}/${assignmentId}`).then(r => r.data as unknown as void);

export const startTask = (taskId: string, studentId: string) =>
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}/tasks/${taskId}/start`, null, { params: { studentId } }).then(r => r.data);

export const updateTaskProgress = (taskId: string, studentId: string, payload: UpdateProgressPayload) =>
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}/tasks/${taskId}/progress`, payload, { params: { studentId } }).then(r => r.data);

export const completeTask = (taskId: string, studentId: string, payload?: UpdateProgressPayload) =>
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}/tasks/${taskId}/complete`, payload ?? {}, { params: { studentId } }).then(r => r.data);
