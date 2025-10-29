import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Drawer,
    Dialog,
    Slide,
    IconButton,
    Chip,
    Button,
    useTheme,
    useMediaQuery,
    Avatar,
    Stack,
    Paper,
    Tooltip,
    Link
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import dayjs from 'dayjs';
import { Student } from '../features/students/types';
import { useAuth } from '../context/AuthContext';
import StickyActionBar from './StickyActionBar/StickyActionBar';

// Slide transition for mobile dialog
const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface LessonDetailPanelProps {
    open: boolean;
    onClose: () => void;
    lesson: any | null;
    student?: Student | null;
    onEdit?: () => void;
    onDelete?: () => void;
}

const LessonDetailPanel: React.FC<LessonDetailPanelProps> = ({
    open,
    onClose,
    lesson,
    student,
    onEdit,
    onDelete
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const [statusColor, setStatusColor] = useState<'primary' | 'success' | 'error'>('primary');
    const [statusIcon, setStatusIcon] = useState<React.ReactElement | undefined>(undefined);

    useEffect(() => {
        if (lesson) {
            switch (lesson.status) {
                case 'COMPLETED':
                    setStatusColor('success');
                    setStatusIcon(<CheckCircleIcon fontSize="small" />);
                    break;
                case 'CANCELED':
                    setStatusColor('error');
                    setStatusIcon(<CancelIcon fontSize="small" />);
                    break;
                default:
                    setStatusColor('primary');
                    setStatusIcon(<ScheduleIcon fontSize="small" />);
            }
        }
    }, [lesson]);

    if (!lesson) return null;

    const formattedDate = dayjs(lesson.dateTime).format('dddd, MMMM D, YYYY');
    const formattedTime = dayjs(lesson.dateTime).format('h:mm A');
    const endTime = dayjs(lesson.dateTime).add(lesson.duration, 'minute').format('h:mm A');

    // Get student initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const studentName = student?.name || 'Unknown Student';
    const studentInitials = getInitials(studentName);

    // Generate a consistent color based on student name
    const getAvatarColor = (name: string) => {
        const colors = [
            '#2573ff', '#00d7c2', '#f6c344', '#ff6b6b',
            '#a394f0', '#4ecdc4', '#ff9f1c', '#8675a9'
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    };

    const avatarColor = getAvatarColor(studentName);

    const panelContent = (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box component={motion.div}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    {lesson.title}
                </Typography>

                <Chip
                    icon={statusIcon}
                    label={lesson.status}
                    color={statusColor}
                    size="medium"
                    sx={{
                        mb: 3,
                        fontWeight: 500,
                        backgroundColor: theme.palette.mode === 'light'
                            ? `${theme.palette[statusColor].light}30`
                            : `${theme.palette[statusColor].dark}30`,
                        color: theme.palette[statusColor].main,
                        '& .MuiChip-icon': {
                            color: 'inherit'
                        }
                    }}
                />
            </Box>

            <Stack spacing={3} sx={{ pb: 'var(--space-64, 64px)' }}>
                {/* Student Info */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        borderRadius: 3,
                        bgcolor: 'background.subtle',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                    component={motion.div}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                            sx={{ 
                                bgcolor: avatarColor,
                                width: 48,
                                height: 48,
                                fontWeight: 600
                            }}
                        >
                            {studentInitials}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {studentName}
                            </Typography>
                            {student?.email && (
                                <Typography variant="body2" color="text.secondary">
                                    {student.email}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Paper>

                {/* Date & Time */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        borderRadius: 3,
                        bgcolor: 'background.subtle',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                    component={motion.div}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                >
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                        Date & Time
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EventIcon fontSize="small" color="action" />
                        <Typography variant="body1">
                            {formattedDate}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body1">
                            {formattedTime} - {endTime} ({lesson.duration} minutes)
                        </Typography>
                    </Box>
                </Paper>

                {/* Location */}
                {lesson.location && (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            borderRadius: 3,
                            bgcolor: 'background.subtle',
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                            Location
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VideocamIcon fontSize="small" color="action" />
                            {lesson.location.includes('http') ? (
                                <Link href={lesson.location} target="_blank" rel="noopener">
                                    Join Zoom Meeting
                                </Link>
                            ) : (
                                <Typography variant="body1">
                                    {lesson.location}
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                )}

                {/* Lesson Plan */}
                {lesson.lessonPlan && (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            borderRadius: 3,
                            bgcolor: 'background.subtle',
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                    >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                            Lesson Plan
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                            {lesson.lessonPlan}
                        </Typography>
                    </Paper>
                )}

                {/* Learning Objectives */}
                {lesson.learningObjectives && (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            borderRadius: 3,
                            bgcolor: 'background.subtle',
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                    >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                            Learning Objectives
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                            {lesson.learningObjectives}
                        </Typography>
                    </Paper>
                )}
            </Stack>

            {/* Action Buttons */}
            {user?.role === 'tutor' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                >
                    <StickyActionBar sx={{ gap: 2, mt: 4 }}>
                        <Tooltip title="Delete Lesson">
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        </Tooltip>
                        <Tooltip title="Edit Lesson">
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={onEdit}
                            >
                                Edit
                            </Button>
                        </Tooltip>
                    </StickyActionBar>
                </motion.div>
            )}
        </Box>
    );

    // Use Drawer for desktop and Dialog for mobile
    return (
        <>
            {!isMobile ? (
                <Drawer
                    anchor="right"
                    open={open}
                    onClose={onClose}
                    PaperProps={{
                        sx: {
                            width: { sm: '450px', md: '500px' },
                            borderRadius: '0',
                            boxShadow: '0 0 20px rgba(0,0,0,0.08)',
                            p: 0,
                        }
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <IconButton onClick={onClose} edge="end" aria-label="close">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ 
                        height: '100%', 
                        overflowY: 'auto',
                        pb: 8
                    }}>
                        {panelContent}
                    </Box>
                </Drawer>
            ) : (
                <Dialog
                    fullScreen
                    open={open}
                    onClose={onClose}
                    TransitionComponent={Transition}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <IconButton onClick={onClose} edge="end" aria-label="close">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ 
                        height: 'calc(100% - 48px)', 
                        overflowY: 'auto',
                        pb: 8
                    }}>
                        {panelContent}
                    </Box>
                </Dialog>
            )}
        </>
    );
};

export default LessonDetailPanel;