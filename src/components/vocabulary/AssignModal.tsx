// src/modules/vocabulary/components/AssignModal.tsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox, ListItemButton
} from '@mui/material';
import { useDictionary } from '../../hooks/useVocabulary';
import { useAssignWords } from '../../hooks/useAssignments';
import { AssignWordsRequest } from '../../types';

interface Props {
    open: boolean;
    studentId: string;
    onClose: () => void;
}

const AssignModal: React.FC<Props> = ({ open, studentId, onClose }) => {
    const { data: words = [] } = useDictionary();
    const assign = useAssignWords();
    const [selected, setSelected] = useState<string[]>([]);

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleAssign = () => {
        const dto: AssignWordsRequest = { studentId, vocabularyWordIds: selected };
        assign.mutate(dto, { onSuccess: () => onClose() });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Assign Words to Student</DialogTitle>
            <DialogContent dividers>
                <List>
                    {words.map((w) => (
                        <ListItem key={w.id} disablePadding>
                                   <ListItemButton onClick={() => toggle(w.id)}>
                                     <ListItemIcon>
                                       <Checkbox
                                         edge="start"
                                         checked={selected.includes(w.id)}
                                         tabIndex={-1}
                                         disableRipple
                                       />
                                     </ListItemIcon>
                                     <ListItemText primary={`${w.text} — ${w.translation}`} />
                                   </ListItemButton>
                                 </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleAssign}
                    disabled={!selected.length}
                >
                    Assign ({selected.length})
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignModal;