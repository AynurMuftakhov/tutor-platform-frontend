import { useQuery } from '@tanstack/react-query';
import { getTutorStatistics } from '../services/api';

export interface TutorStatistics {
  taughtStudents: number;
  completedLessons: number;
}

export const useTutorStatistics = (tutorId: string) => {
  return useQuery<TutorStatistics>({
    queryKey: ['tutor', tutorId, 'statistics'],
    queryFn: () => getTutorStatistics(tutorId),
    enabled: !!tutorId,
  });
};