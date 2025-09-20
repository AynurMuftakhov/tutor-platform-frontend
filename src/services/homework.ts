import { AssignmentDto, CreateAssignmentDto, PageResult, UpdateProgressPayload } from '../types/homework';
import api from './api';

// Endpoints base: prefer env override, fallback to service prefix
const HOMEWORKS_BASE = (import.meta as any).env?.VITE_HOMEWORKS_BASE || '/homework-service/api/homeworks';

type ProgressDto = {
  progressPct?: number;
  meta?: Record<string, unknown>;
};

const toProgressDto = (payload?: UpdateProgressPayload): ProgressDto => {
  if (!payload) return {};
  const dto: ProgressDto = {};
  const maybePct = typeof payload.progressPct === 'number' ? Math.round(payload.progressPct) : undefined;
  if (typeof maybePct === 'number' && Number.isFinite(maybePct)) {
    dto.progressPct = Math.max(0, Math.min(100, maybePct));
  }

  const meta: Record<string, unknown> = {};
  if (payload.meta) Object.assign(meta, payload.meta);
  if (payload.stats) meta.stats = payload.stats;
  if (payload.masteredWordIds) meta.masteredWordIds = payload.masteredWordIds;
  if (payload.lastEvent) meta.lastEvent = payload.lastEvent;

  if (Object.keys(meta).length > 0) {
    dto.meta = meta;
  }

  return dto;
};

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
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}/tasks/${taskId}/progress`, toProgressDto(payload), { params: { studentId } }).then(r => r.data);

export const completeTask = (taskId: string, studentId: string, payload?: UpdateProgressPayload) =>
  api.post<AssignmentDto>(`${HOMEWORKS_BASE}/tasks/${taskId}/complete`, payload ? toProgressDto(payload) : {}, { params: { studentId } }).then(r => r.data);
