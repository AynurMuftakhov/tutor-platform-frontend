import { useMutation } from '@tanstack/react-query';
import { sendStudentNudge, type SendStudentNudgeResponse } from '../../../services/api';
import { trackAnalyticsEvent } from '../../../services/analytics';

export interface StudentNudgeVariables {
    studentId: string;
    reason: string;
    message?: string;
}

export const useStudentNudge = (teacherId: string | undefined) => {
    return useMutation<SendStudentNudgeResponse, unknown, StudentNudgeVariables>({
        mutationKey: ['student-nudge', teacherId],
        mutationFn: ({ studentId, reason, message }) => {
            if (!teacherId) {
                return Promise.reject(new Error('Teacher id missing'));
            }
            return sendStudentNudge(teacherId, studentId, { reason, message });
        },
        onSuccess: (_, variables) => {
            trackAnalyticsEvent('student_nudge_sent', {
                teacherId,
                studentId: variables.studentId,
                reason: variables.reason,
            });
        },
    });
};
