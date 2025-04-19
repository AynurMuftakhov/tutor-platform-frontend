import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../services/vocabulary.api';
import { AssignWordsRequest } from '../types';

export const useAssignments = (studentId: string) =>
    useQuery({
        queryKey: ['assignments', studentId],
        queryFn: () => vocabApi.listAssignments(studentId),
        enabled: Boolean(studentId)
    });

export const useAssignWords = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: AssignWordsRequest) => vocabApi.assign(dto),
        onSuccess: (_, dto) => qc.invalidateQueries({ queryKey: ['assignments', dto.studentId] })
    });
};

// New hook:
export const useUpdateAssignment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, studentId }: { id: string; status: string; studentId: string }) =>
            vocabApi.updateAssignment(id, status),
        onSuccess: (_updated, { studentId }) =>
            qc.invalidateQueries({ queryKey: ['assignments', studentId] })
    });
};