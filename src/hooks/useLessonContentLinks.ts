import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLessonContentLinks,
  linkLessonContentToLesson,
  unlinkLessonContentFromLesson,
} from '../services/api';
import type { LessonContentLink } from '../types/lessonContent';

export const useLessonContentLinks = (lessonId: string) => useQuery<LessonContentLink[]>({
  queryKey: ['lessonContentLinks', lessonId],
  queryFn: () => fetchLessonContentLinks(lessonId),
  enabled: !!lessonId,
});

export const useLinkLessonContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, lessonContentId }: { lessonId: string; lessonContentId: string }) =>
      linkLessonContentToLesson(lessonId, lessonContentId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lessonContentLinks', vars.lessonId] });
    },
  });
};

export const useUnlinkLessonContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, linkId }: { lessonId: string; linkId: string }) =>
      unlinkLessonContentFromLesson(lessonId, linkId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lessonContentLinks', vars.lessonId] });
    },
  });

};
