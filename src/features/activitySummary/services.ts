import { api } from '../../services/api';
import type { ActivitySummaryResponse } from './types';

const normalizeRangeParam = (rangeDays: number): number => {
  if (!Number.isFinite(rangeDays)) return 7;
  if (rangeDays < 1) return 1;
  if (rangeDays > 30) return 30;
  return Math.round(rangeDays);
};

export const fetchTeacherActivitySummary = async (
  teacherId: string,
  rangeDays: number
): Promise<ActivitySummaryResponse> => {
  const range = normalizeRangeParam(rangeDays);
  const params = new URLSearchParams({ range: String(range) });
  const { data } = await api.get<ActivitySummaryResponse>(`/users-service/api/teachers/${teacherId}/students/activity/summary?${params}`);
  return data;
};

export const fetchTeacherActivitySummaryLight = async (
  teacherId: string,
  rangeDays: number
): Promise<ActivitySummaryResponse> => {
  const range = normalizeRangeParam(rangeDays);
  const params = new URLSearchParams({ range: String(range), light: 'true' });
  const { data } = await api.get<ActivitySummaryResponse>(`/users-service/api/teachers/${teacherId}/students/activity/summary?${params}`);
  return data;
};
