import React, {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    TextField,
    Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {useAssignWords} from '../../hooks/useAssignments';
import {AssignWordsRequest} from '../../types';
import {useQuery} from '@tanstack/react-query';
import {fetchStudents} from "../../services/api";
import {useAuth} from "../../context/AuthContext";
import {Student} from "../../pages/MyStudentsPage";

interface Props {
    open: boolean;
    onClose: () => void;
    selectedWords: string[];
}

const AssignStudentModal: React.FC<Props> = ({ open, onClose, selectedWords }) => {
    const [search, setSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const assignWords = useAssignWords();
    const { user } = useAuth();

    // Fetch students (this would typically come from an API)
    const { data: students = [], isLoading } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const response = await fetchStudents(user!.id, "", 0, 100);
            return response.content as Student[];
        },
        // Disable if modal is not open to avoid unnecessary requests
        enabled: open
    });

    // Filter students based on search
    const filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        (student.email ? student.email.toLowerCase().includes(search.toLowerCase()) : false)
    );

    const toggleStudent = (id: string) =>
        setSelectedStudents((prev) => 
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const handleAssign = () => {
        if (selectedStudents.length === 0 || selectedWords.length === 0) return;

        // Assign words to each selected student
        const promises = selectedStudents.map(studentId => {
            const dto: AssignWordsRequest = { 
                studentId, 
                vocabularyWordIds: selectedWords 
            };
            return assignWords.mutate(dto);
        });

        // Close modal after all assignments are processed
        Promise.all(promises).then(() => {
            onClose();
            // Reset selection
            setSelectedStudents([]);
        });
    };

    // Reset selection when modal opens/closes
    useEffect(() => {
        if (!open) {
            setSelectedStudents([]);
            setSearch('');
        }
    }, [open]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                Assign Words to Students
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Select students to assign {selectedWords.length} word(s) to
                </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
                <TextField
                    placeholder="Search students..."
                    fullWidth
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        )
                    }}
                    sx={{ mb: 2 }}
                />
                
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredStudents.length > 0 ? (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {filteredStudents.map((student) => (
                            <ListItem key={student.id} disablePadding>
                                <ListItemButton onClick={() => toggleStudent(student.id)}>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge="start"
                                            checked={selectedStudents.includes(student.id)}
                                            tabIndex={-1}
                                            disableRipple
                                        />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={student.name} 
                                        secondary={student.email || '—'} 
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No students found
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleAssign}
                    disabled={selectedStudents.length === 0 || assignWords.isPending}
                >
                    {assignWords.isPending ? (
                        <CircularProgress size={24} />
                    ) : (
                        `Assign to ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''}`
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignStudentModal;