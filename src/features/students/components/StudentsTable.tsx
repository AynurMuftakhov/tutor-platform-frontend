import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Chip,
  TableContainer,
  Typography,
  useMediaQuery,
  useTheme,
  TablePagination,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from '@mui/x-data-grid';

import { ENGLISH_LEVELS } from '../../../types/ENGLISH_LEVELS';
import type { Student } from '../types';
import StudentActionButtons from './StudentActionButtons';
import StudentCardList from './StudentCardList';

type StudentsTableProps = {
  students: Student[];
  loading: boolean;
  rowCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onRowClick: (student: Student) => void;
  onEditStudent: (student: Student) => void | Promise<void>;
  onViewVocabulary: (student: Student) => void | Promise<void>;
  onSendReset: (student: Student) => void | Promise<void>;
  onInvite: (student: Student) => void | Promise<void>;
  onDelete: (student: Student) => void | Promise<void>;
};

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const CustomToolbar: React.FC = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarDensitySelector />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onRowClick,
  onEditStudent,
  onViewVocabulary,
  onSendReset,
  onInvite,
  onDelete,
}) => {
  const theme = useTheme();
  const isCompact = useMediaQuery('(max-width: 900px)');

  const columns = useMemo<GridColDef<Student>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        renderCell: (params: GridRenderCellParams<Student>) => (
          <Box display="flex" alignItems="center">
            <Avatar
              src={params.row.avatar}
              alt={params.row.name}
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
                bgcolor: (theme) => theme.palette.primary.light,
                mr: 1,
              }}
            />
            <Typography fontWeight={600}>{params.row.name}</Typography>
          </Box>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        renderCell: (params: GridRenderCellParams<Student>) =>
          params.row.email ? (
            <Typography variant="body2">{params.row.email}</Typography>
          ) : (
            <Chip
              label="link-only"
              size="small"
              sx={{
                bgcolor: (theme) => theme.palette.action.hover,
                color: (theme) => theme.palette.text.secondary,
              }}
            />
          ),
      },
      {
        field: 'level',
        headerName: 'Level',
        width: 160,
        renderCell: (params: GridRenderCellParams<Student>) => {
          const level = params.row.level;
          const levelInfo = ENGLISH_LEVELS[level];

          return (
            <Chip
              label={`${level} (${levelInfo?.code ?? 'N/A'})`}
              size="small"
              sx={{
                backgroundColor: '#f0f4ff',
                color: '#1e3a8a',
                fontWeight: 600,
                borderRadius: '8px',
                px: 1.5,
              }}
            />
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Student>) => (
          <Box onClick={(event) => event.stopPropagation()}>
            <StudentActionButtons
              student={params.row}
              onEdit={onEditStudent}
              onViewVocabulary={onViewVocabulary}
              onSendReset={onSendReset}
              onInvite={onInvite}
              onDelete={onDelete}
            />
          </Box>
        ),
      },
    ],
    [onDelete, onEditStudent, onInvite, onSendReset, onViewVocabulary]
  );

  if (isCompact) {
    const handleCardPageChange = (_: unknown, newPage: number) => {
      onPaginationModelChange({ page: newPage, pageSize: paginationModel.pageSize });
    };

    const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onPaginationModelChange({ page: 0, pageSize: parseInt(event.target.value, 10) });
    };

    return (
      <Box sx={{ display: 'grid', gap: 'var(--space-12)' }}>
        <StudentCardList
          students={students}
          loading={loading}
          onRowClick={onRowClick}
          onEditStudent={onEditStudent}
          onViewVocabulary={onViewVocabulary}
          onSendReset={onSendReset}
          onInvite={onInvite}
          onDelete={onDelete}
        />
        <TablePagination
          component="div"
          count={rowCount}
          page={paginationModel.page}
          onPageChange={handleCardPageChange}
          rowsPerPage={paginationModel.pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        />
      </Box>
    );
  }

  return (
    <TableContainer
      component="div"
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'visible',
        [theme.breakpoints.up('lg')]: {
          maxHeight: 'calc(100dvh - 260px)',
          overflowY: 'auto',
        },
      }}
    >
      <Box sx={{ minWidth: 600 }}>
        <DataGrid
          rows={students}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          onRowClick={(params) => onRowClick(params.row)}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          disableRowSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          autoHeight
          sx={{
            border: 'none',
            cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: (theme) => theme.palette.action.hover,
            },
          }}
        />
      </Box>
    </TableContainer>
  );
};

export default StudentsTable;
