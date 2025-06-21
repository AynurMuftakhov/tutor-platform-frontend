import React from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    SwipeableDrawer,
    useTheme,
    useMediaQuery,
    IconButton,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { ListeningTask } from '../../types';
import { ListeningCard } from '../lessonDetail/ListeningCard';

interface Props {
    tasks: ListeningTask[];
    loading: boolean;
    error: string | null;
    isTutor: boolean;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onPlayInLesson: (task: ListeningTask) => void;
}

const ListeningTaskDrawer: React.FC<Props> = ({
                                                  tasks,
                                                  loading,
                                                  error,
                                                  isTutor,
                                                  isOpen,
                                                  onOpen,
                                                  onClose,
                                                  onPlayInLesson,
                                              }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const content = (
        <Box sx={{ width: 360 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                <Typography variant="h6">Listening Tasks</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error">{error}</Typography>
                ) : tasks.length === 0 ? (
                    <Typography>No listening tasks available</Typography>
                ) : (
                    tasks.map(t => (
                        <ListeningCard
                            key={t.id}
                            task={t}
                            isInLesson
                            isTutor={isTutor}
                            onPlayInLesson={onPlayInLesson}
                        />
                    ))
                )}
            </Box>
        </Box>
    );

    /* burger button only mobile */
    const burger =
        isMobile && (
            <IconButton
                onClick={onOpen}
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '&:hover': { bgcolor: 'primary.dark' },
                    zIndex: 1300,
                }}
            >
                <MenuIcon />
            </IconButton>
        );

    return (
        <>
            <SwipeableDrawer
                anchor="right"
                open={isMobile ? isOpen : true}
                onClose={onClose}
                onOpen={onOpen}
                variant={isMobile ? 'temporary' : 'permanent'}
                ModalProps={{ keepMounted: true }}
                sx={{
                    '& .MuiDrawer-paper': { width: 360 },
                    display: { xs: 'block', md: isTutor ? 'block' : 'none' },
                }}
            >
                {content}
            </SwipeableDrawer>
            {burger}
        </>
    );
};

export default ListeningTaskDrawer;