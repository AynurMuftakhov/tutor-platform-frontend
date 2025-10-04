import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AssignmentDto, CreateAssignmentDto, PageResult, UpdateProgressPayload } from '../types/homework';
import { completeTask, createHomework, deleteHomework, getStudentHomeworks, getTutorHomeworks, startTask, updateTaskProgress } from '../services/homework';

export const useStudentAssignments = (studentId: string, pageable?: { page?: number; size?: number }) => {
  return useQuery<PageResult<AssignmentDto>>({
    queryKey: ['homeworks', 'student', { studentId, pageable }],
    queryFn: () => getStudentHomeworks(studentId, pageable),
    enabled: !!studentId,
  });
};

export const useTeacherAssignments = (tutorId: string, studentId?: string, pageable?: { page?: number; size?: number }) => {
  return useQuery<PageResult<AssignmentDto>>({
    queryKey: ['homeworks', 'tutor', { tutorId, studentId, pageable }],
    queryFn: () => getTutorHomeworks(tutorId, studentId, pageable),
    enabled: !!tutorId,
  });
};

export const useCreateAssignment = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssignmentDto) => createHomework(teacherId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homeworks'] });
    },
  });
};

export const useStartTask = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => startTask(taskId, studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homeworks'] }),
  });
};

export const useUpdateTaskProgress = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateProgressPayload }) => updateTaskProgress(taskId, studentId, payload),
    // Do NOT invalidate on each progress tick to avoid disruptive rerenders of homework page during quiz.
    // The UI maintains local progress; we will rely on completion/start invalidations for list refresh.
    onSuccess: () => {
      // no-op; optionally could update cache minimally here
    },
  });
};

export const useCompleteTask = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload?: UpdateProgressPayload }) => completeTask(taskId, studentId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homeworks'] }),
  });
};

export const useDeleteAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => deleteHomework(assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homeworks'] }),
  });
};
