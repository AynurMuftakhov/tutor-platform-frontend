import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AssignmentDto, AssignmentListItemDto, CreateAssignmentDto, PageResult, ReassignHomeworkDto, UpdateProgressPayload } from '../types/homework';
import { completeTask, createHomework, createHomeworksBulk, deleteHomework, getStudentHomeworks, getTutorHomeworks, reassignHomework, startTask, updateTaskProgress, getAssignmentById, getStudentHomeworkCounts, HomeworkListParams } from '../services/homework';

export const useStudentAssignments = (studentId: string, params?: HomeworkListParams) => {
  return useQuery<PageResult<AssignmentListItemDto>>({
    queryKey: ['homeworks', 'student', { studentId, params }],
    queryFn: () => getStudentHomeworks(studentId, params),
    enabled: !!studentId,
  });
};

export const useStudentHomeworkCounts = (studentId: string, params?: { from?: string; to?: string; includeOverdue?: boolean }) => {
  return useQuery<{ notFinished: number; completed: number; overdue: number; active: number; all: number }>({
    queryKey: ['homeworks', 'student', 'counts', { studentId, params }],
    queryFn: () => getStudentHomeworkCounts(studentId, params || {}),
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

export const useTeacherAssignments = (tutorId: string, params?: HomeworkListParams) => {
  return useQuery<PageResult<AssignmentListItemDto>>({
    queryKey: ['homeworks', 'tutor', { tutorId, params }],
    queryFn: () => getTutorHomeworks(tutorId, params),
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

export const useCreateAssignmentsBulk = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssignmentDto) => createHomeworksBulk(teacherId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homeworks'] });
    },
  });
};

export const useReassignHomework = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: ReassignHomeworkDto }) =>
      reassignHomework(teacherId, assignmentId, payload),
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

export const useAssignmentById = (assignmentId: string | undefined, opts?: { studentId?: string; initialData?: AssignmentDto; enabled?: boolean }) => {
  return useQuery<AssignmentDto>({
    queryKey: ['homeworks', 'assignment', { assignmentId, studentId: opts?.studentId }],
    queryFn: () => getAssignmentById(assignmentId as string, opts?.studentId),
    enabled: !!assignmentId && (opts?.enabled ?? true),
    initialData: opts?.initialData,
  });
};
