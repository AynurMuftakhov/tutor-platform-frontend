import React, { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Close as CloseIcon,
    Videocam as VideoIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { useLessonMaterials } from '../../hooks/useLessonMaterials';
import { Material } from '../materials/MaterialCard';

interface MaterialDrawerProps {
    open: boolean;
    onClose: () => void;
    lessonId: string;
    onSelectMaterial?: (material: Material) => void;
}

const MaterialDrawer: React.FC<MaterialDrawerProps> = ({
                                                           open,
                                                           onClose,
                                                           lessonId,
                                                           onSelectMaterial,
                                                       }) => {
    // Fetch lesson materials
    const { data: materials, isLoading, error } = useLessonMaterials(lessonId);

    // Filter to only show videos
    const videoMaterials = materials?.filter((material: { material: Material }) => material.material.type === 'VIDEO') || [];

    // Handle material selection
    const handleSelectMaterial = (material: Material) => {
        if (onSelectMaterial) {
            onSelectMaterial(material);
            onClose(); // Close the drawer after selection
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            SlideProps={{ direction: 'left' }}
            PaperProps={{
                sx: {
                    width: 320,
                    p: 2,
                    bgcolor: 'background.paper',
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="div">
                    Lesson Materials
                </Typography>
                <IconButton onClick={onClose} edge="end" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography color="error" align="center">
                        Failed to load materials. Please try again.
                    </Typography>
                </Box>
            ) : videoMaterials.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 4 }}>
                    No video materials available for this lesson.
                </Typography>
            ) : (
                <List sx={{ width: '100%', p: 0 }}>
                    {videoMaterials.map((material: { material: Material }) => (
                        <ListItem
                            key={material.material.id}
                            onClick={() => handleSelectMaterial(material.material)}
                            sx={{
                                borderRadius: 1,
                                mb: 1,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar
                                    src={material.material.thumbnailUrl}
                                    variant="rounded"
                                    sx={{ bgcolor: 'primary.light' }}
                                >
                                    <VideoIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={material.material.title}
                                secondary={
                                    material.material.duration
                                        ? `Duration: ${Math.floor(material.material.duration / 60)}:${String(
                                            material.material.duration % 60
                                        ).padStart(2, '0')}`
                                        : 'Video'
                                }
                                primaryTypographyProps={{
                                    noWrap: true,
                                    title: material.material.title,
                                }}
                                secondaryTypographyProps={{
                                    noWrap: true,
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Drawer>
    );
};

export default MaterialDrawer;