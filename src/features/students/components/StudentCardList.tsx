import React, { KeyboardEvent } from 'react';
import {
  Avatar,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';

import { ENGLISH_LEVELS } from '../../../types/ENGLISH_LEVELS';
import type { Student } from '../types';
import StudentActionButtons from './StudentActionButtons';

type StudentCardListProps = {
  students: Student[];
  loading?: boolean;
  onRowClick?: (student: Student) => void;
  onEditStudent: (student: Student) => void | Promise<void>;
  onViewVocabulary: (student: Student) => void | Promise<void>;
  onSendReset: (student: Student) => void | Promise<void>;
  onInvite: (student: Student) => void | Promise<void>;
  onDelete: (student: Student) => void | Promise<void>;
};

const StudentCardList: React.FC<StudentCardListProps> = ({
  students,
  loading,
  onRowClick,
  onEditStudent,
  onViewVocabulary,
  onSendReset,
  onInvite,
  onDelete,
}) => {
  const handleKeyDown = (student: Student) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(student);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 'var(--space-12)' }}>
      {loading && <LinearProgress />}
      {!loading && students.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body1">No students found.</Typography>
        </Paper>
      ) : (
        students.map((student) => {
          const levelInfo = ENGLISH_LEVELS[student.level];

          return (
            <Paper
              key={student.id}
              variant="outlined"
              tabIndex={0}
              onKeyDown={handleKeyDown(student)}
              onClick={() => onRowClick?.(student)}
              sx={{
                p: 2,
                borderRadius: 2,
                display: 'grid',
                gap: 'var(--space-12)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s ease',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
                '&:hover': {
                  boxShadow: onRowClick ? 3 : undefined,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Avatar
                  src={student.avatar}
                  alt={student.name}
                  sx={{
                    width: 48,
                    height: 48,
                    fontSize: 18,
                    bgcolor: (theme) => theme.palette.primary.light,
                  }}
                >
                  {student.name.charAt(0)}
                </Avatar>
                <Box sx={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {student.name}
                  </Typography>
                  {student.email ? (
                    <Typography variant="body2" color="text.secondary">
                      {student.email}
                    </Typography>
                  ) : (
                    <Chip
                      label="link-only"
                      size="small"
                      sx={{
                        width: 'fit-content',
                        bgcolor: (theme) => theme.palette.action.hover,
                        color: (theme) => theme.palette.text.secondary,
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-12)',
                }}
              >
                <Chip
                  label={`${student.level} (${levelInfo?.code ?? 'N/A'})`}
                  size="small"
                  sx={{
                    backgroundColor: '#f0f4ff',
                    color: '#1e3a8a',
                    fontWeight: 600,
                    borderRadius: '8px',
                    px: 1.5,
                  }}
                />
                <StudentActionButtons
                  student={student}
                  onEdit={onEditStudent}
                  onViewVocabulary={onViewVocabulary}
                  onSendReset={onSendReset}
                  onInvite={onInvite}
                  onDelete={onDelete}
                />
              </Box>
            </Paper>
          );
        })
      )}
    </Box>
  );
};

export default StudentCardList;
