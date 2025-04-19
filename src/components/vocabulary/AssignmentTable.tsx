import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import { AssignedWordResponse } from '../../types';

interface Props {
    data: AssignedWordResponse[];
    onMarkLearned: (id: string) => void;
}

const AssignmentTable: React.FC<Props> = ({ data, onMarkLearned }) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Word</TableCell>
                    <TableCell>Translation</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Repetitions</TableCell>
                    <TableCell>Last Checked</TableCell>
                    <TableCell align="right">Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row) => (
                    <TableRow key={row.id} hover>
                        <TableCell>{row.text}</TableCell>
                        <TableCell>{row.translation}</TableCell>
                        <TableCell>
                            <Chip
                                label={row.status}
                                size="small"
                                color={row.status === 'LEARNED' ? 'success' : 'warning'}
                            />
                        </TableCell>
                        <TableCell>{row.repetitionCount}</TableCell>
                        <TableCell>
                            {row.lastCheckedDate
                                ? new Date(row.lastCheckedDate).toLocaleDateString()
                                : '-'}
                        </TableCell>
                        <TableCell align="right">
                            {row.status !== 'LEARNED' && (
                                <IconButton size="small" color="primary" onClick={() => onMarkLearned(row.id)}>
                                    <DoneIcon fontSize="small" />
                                </IconButton>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export default AssignmentTable;