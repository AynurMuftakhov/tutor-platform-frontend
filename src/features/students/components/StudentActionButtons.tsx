import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';

import type { Student } from '../types';

type StudentActionHandler = (student: Student) => void | Promise<void>;

type ActionButtonsProps = {
  student: Student;
  onEdit: StudentActionHandler;
  onViewVocabulary: StudentActionHandler;
  onSendReset: StudentActionHandler;
  onInvite: StudentActionHandler;
  onDelete: StudentActionHandler;
};

const StudentActionButtons: React.FC<ActionButtonsProps> = ({
  student,
  onEdit,
  onViewVocabulary,
  onSendReset,
  onInvite,
  onDelete,
}) => {
  const createHandler = (handler: StudentActionHandler) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      handler(student);
    };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title="Edit">
        <IconButton color="primary" size="small" onClick={createHandler(onEdit)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Vocabulary">
        <IconButton color="info" size="small" onClick={createHandler(onViewVocabulary)}>
          <MenuBookIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {student.email && (
        <Tooltip title="Send password reset email">
          <IconButton color="info" size="small" onClick={createHandler(onSendReset)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Invite / Copy link (single-use)">
        <IconButton color="primary" size="small" onClick={createHandler(onInvite)}>
          <LinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton color="error" size="small" onClick={createHandler(onDelete)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default StudentActionButtons;
