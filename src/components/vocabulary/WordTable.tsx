import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { VocabularyWordResponse } from '../../types';

interface Props {
    data: VocabularyWordResponse[];
    onEdit: (word: VocabularyWordResponse) => void;
    onDelete: (id: string) => void;
}

const WordTable: React.FC<Props> = ({ data, onEdit, onDelete }) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Word</TableCell>
                    <TableCell>Translation</TableCell>
                    <TableCell>Part of Speech</TableCell>
                    <TableCell align="right">Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row) => (
                    <TableRow key={row.id} hover>
                        <TableCell>{row.text}</TableCell>
                        <TableCell>{row.translation}</TableCell>
                        <TableCell>{row.partOfSpeech || '-'}</TableCell>
                        <TableCell align="right">
                            <IconButton size="small" onClick={() => onEdit(row)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export default WordTable;