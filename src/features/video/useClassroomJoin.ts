import { useMutation } from '@tanstack/react-query';
import type { Role } from '../../types/video';
import {joinLesson} from "../../services/api";

export function useClassroomJoin() {
  return useMutation({
    mutationFn: (args: { userId?: string; lessonId: string; role: Role }) => joinLesson(args.userId || '', { lessonId: args.lessonId, role: args.role }),
  });
}
