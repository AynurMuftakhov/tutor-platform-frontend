// src/modules/vocabulary/pages/StudentVocabularyPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useAssignments, useUpdateAssignment } from '../hooks/useAssignments';
import AssignmentTable from '../components/vocabulary/AssignmentTable';
import AssignModal from '../components/vocabulary/AssignModal';

const StudentVocabularyPage: React.FC = () => {
    const { studentId = '' } = useParams<{ studentId: string }>();
    const { data: assignments = [], isLoading, error } = useAssignments(studentId);
    const updateAssignment = useUpdateAssignment();

    const [modalOpen, setModalOpen] = useState(false);

    const handleMarkLearned = (id: string) => {
        updateAssignment.mutate({ id, status: 'LEARNED', studentId });
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">Student Vocabulary</Typography>
                <Button variant="contained" onClick={() => setModalOpen(true)}>
                    Assign Words
                </Button>
            </Box>

            {isLoading && <Typography>Loading assignments...</Typography>}
            {error && <Typography color="error">Error loading assignments.</Typography>}

            {!isLoading && !error && (
                <AssignmentTable
                    data={assignments}
                    onMarkLearned={handleMarkLearned}
                />
            )}

            <AssignModal
                open={modalOpen}
                studentId={studentId}
                onClose={() => setModalOpen(false)}
            />
        </Box>
    );
};

export default StudentVocabularyPage;