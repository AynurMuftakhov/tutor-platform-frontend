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
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {VocabularyWord} from '../../types';

interface Props {
    data: VocabularyWord[];
    onDelete: (id: string) => void;
    onRowClick: (word: VocabularyWord) => void;
}

const WordTable: React.FC<Props> = ({data, onDelete, onRowClick}) => (
    <TableContainer component={Paper} elevation={0} sx={{borderRadius: 1}}>
        <Table size="small">
            <TableHead>
                <TableRow sx={{'& th': {fontWeight: 600}}}>
                    <TableCell>Word</TableCell>
                    <TableCell>Translation</TableCell>
                    <TableCell>Part&nbsp;of&nbsp;Speech</TableCell>
                    <TableCell>Synonyms</TableCell>
                    <TableCell>Pronunciation</TableCell>
                    <TableCell align="right">Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map(row => (
                    <TableRow
                        key={row.id}
                        hover
                        sx={{cursor: 'pointer'}}
                        onClick={() => onRowClick(row)}
                    >
                        <TableCell>{row.text}</TableCell>
                        <TableCell>{row.translation}</TableCell>
                        <TableCell sx={{textTransform: 'capitalize'}}>{row.partOfSpeech}</TableCell>
                        <TableCell
                            sx={{
                                maxWidth: 200,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {row.synonymsEn.join(', ')}
                        </TableCell>
                        <TableCell>
                            {row.audioUrl && (
                                <Tooltip title="Play pronunciation" onClick={e => e.stopPropagation()}>
                                    <IconButton size="small" onClick={() => new Audio(row.audioUrl as string).play()}>
                                        <VolumeUpIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </TableCell>
                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                            <IconButton color="error" size="small" onClick={() => onDelete(row.id)}>
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