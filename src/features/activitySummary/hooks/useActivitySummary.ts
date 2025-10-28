import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeacherActivitySummary, fetchTeacherActivitySummaryLight } from '../services';
import { activitySummaryConfig } from '../config';
import { buildStudentViewModels, computeMedian, computeStdDev } from '../utils';
import type { ActivitySummaryResponse, StudentActivityViewModel } from '../types';

export interface UseActivitySummaryOptions {
  teacherId: string | undefined;
  enabled?: boolean;
}

export interface ActivitySummaryResult {
  data?: ActivitySummaryResponse;
  students: StudentActivityViewModel[];
  medianActiveMinutesToday: number;
  median7dActiveAverage: number;
  stdDev7dActiveAverage: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<ActivitySummaryResponse | undefined>;
}

const summaryQueryKey = (teacherId?: string) => ['teacher-activity-summary', teacherId, '7d'] as const;
const summaryLightQueryKey = (teacherId?: string) => ['teacher-activity-summary-light', teacherId] as const;

export const useActivitySummary = ({ teacherId, enabled = true }: UseActivitySummaryOptions): ActivitySummaryResult => {
  const queryClient = useQueryClient();

  const query = useQuery<ActivitySummaryResponse>({
    queryKey: summaryQueryKey(teacherId),
    queryFn: () => fetchTeacherActivitySummary(teacherId!, 7),
    enabled: Boolean(teacherId) && activitySummaryConfig.enabled && enabled,
    staleTime: activitySummaryConfig.pollIntervalMs,
    refetchInterval: activitySummaryConfig.pollIntervalMs,
  });

  // Lightweight query to refresh only Class Pulse + online statuses
  const lightQuery = useQuery<ActivitySummaryResponse>({
    queryKey: summaryLightQueryKey(teacherId),
    queryFn: () => fetchTeacherActivitySummaryLight(teacherId!, 1),
    enabled: Boolean(teacherId) && activitySummaryConfig.enabled && enabled,
    staleTime: activitySummaryConfig.kpiRefreshMs,
    refetchInterval: activitySummaryConfig.kpiRefreshMs,
  });

  useEffect(() => {
    const lightSummary = lightQuery.data;
    if (!lightSummary || !teacherId) return;
    const key = summaryQueryKey(teacherId);
    const existing = queryClient.getQueryData<ActivitySummaryResponse>(key);
    if (!existing) return;
    const merged: ActivitySummaryResponse = {
      ...existing,
      generatedAt: lightSummary.generatedAt ?? existing.generatedAt,
      onlineNow: lightSummary.onlineNow ?? existing.onlineNow,
      stats: {
        ...existing.stats,
        ...lightSummary.stats,
      },
      students: existing.students.map((student) => {
        const updated = lightSummary.students.find((candidate) => candidate.studentId === student.studentId);
        return updated
          ? { ...student, lastSeenTs: updated.lastSeenTs ?? student.lastSeenTs, online: updated.online ?? student.online }
          : student;
      }),
    };
    queryClient.setQueryData(key, merged);
  }, [lightQuery.data, queryClient, teacherId]);

  const students = useMemo(() => buildStudentViewModels(query.data), [query.data]);
  const medianActiveMinutesToday = useMemo(() => {
    const todays = students.map((s) => s.todayMinutes.active);
    return computeMedian(todays);
  }, [students]);

  const activeAverages = useMemo(() => students.map((s) => s.stats.average7dActiveMinutes), [students]);
  const median7dActiveAverage = useMemo(() => computeMedian(activeAverages), [activeAverages]);
  const stdDev7dActiveAverage = useMemo(() => computeStdDev(activeAverages), [activeAverages]);

  const refetch = async () => {
    const res = await query.refetch();
    return res.data;
  };

  return {
    data: query.data,
    students,
    medianActiveMinutesToday,
    median7dActiveAverage,
    stdDev7dActiveAverage,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
};
