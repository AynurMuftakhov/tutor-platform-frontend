import React, { useState, useEffect } from "react";
import {
    AppBar, Avatar, Badge, Box, Button, CssBaseline, Dialog, DialogActions, DialogContent,
    DialogTitle, Drawer, IconButton, List, ListItem, ListItemButton, Tooltip,
    ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Toolbar, Typography, useTheme, alpha, GlobalStyles
} from "@mui/material";

import {
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    fetchNotifications, getCurrentLesson
} from "../services/api";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import EventNoteIcon from "@mui/icons-material/EventNote";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CheckIcon from "@mui/icons-material/Check";
import SchoolIcon from "@mui/icons-material/School";
import BookIcon from "@mui/icons-material/Book";
import GridViewIcon from "@mui/icons-material/GridView";
import { motion } from "framer-motion";
import useMediaQuery from '@mui/material/useMediaQuery';

import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import {useNotificationSocket} from "../context/NotificationsSocketContext";
import NotificationToasterWrapper from "../components/NotificationToasterWrapper";
import {DeleteOutline} from "@mui/icons-material";
import MotionDivTransition from "../components/MotionDivTransition";

export const drawerWidth = 280;
const BRAND_NAME = "SpeakShire";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
    const { notifications, isPanelOpen, togglePanel, setNotifications } = useNotificationSocket();
    const [hasMounted, setHasMounted] = useState(false);
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

    // Check if current page is video call page
    const location = useLocation();
    const isVideoCallPage = location.pathname === '/video-call';

    const isProfileMenuOpen = Boolean(profileAnchorEl);

    const { user, logout } = useAuth();
    const isTeacher = user?.role === "tutor";
    const navigate = useNavigate();

    const menuItems = [
        { label: "Dashboard", icon: <HomeIcon />, path: "/dashboard" },
        ...(user?.role === "tutor"
            ? [{ label: "Students", icon: <PeopleIcon />, path: "/my-students" },
            ]
            : [ ]),
        { label: "Vocabulary", icon: <EventNoteIcon />, path: "/vocabulary" },
        { label: "Lessons", icon: <EventNoteIcon />, path: "/lessons" }
    ];

    const handleDrawerToggle = () => {
        if (isVideoCallPage) return; // Don't toggle drawer on video call page
        setMobileOpen(!mobileOpen);
    };
    const handleProfileMenuOpen = (e: React.MouseEvent<HTMLElement>) => setProfileAnchorEl(e.currentTarget);
    const handleProfileMenuClose = () => setProfileAnchorEl(null);
    const handleProfile = () => {
        handleProfileMenuClose();
        navigate("/profile");
    };
    const handleLogout = () => {
        handleProfileMenuClose();
        logout();
        setIsDialogOpen(false);
    };
    const openDialog = () => {
        handleProfileMenuClose();
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (user?.id) {
            try {
                await markAllNotificationsAsRead(user.id);
                const updated = await fetchNotifications(user.id);
                setNotifications(updated);
            } catch (error) {
                console.error("Failed to mark all notifications as read", error);
            }
        }
    };

    const handleClearAll = async () => {
        if (user?.id) {
            try {
                await clearAllNotifications(user.id);
                setNotifications([]);
            } catch (error) {
                console.error("Failed to clear all notifications", error);
            }
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    useEffect(() => {
        const fetchCurrentLesson = async () => {
            try {
                const teacherId = isTeacher ? user?.id : undefined;
                const studentId = !isTeacher ? user?.id : undefined;

                const res = await getCurrentLesson(teacherId as string, studentId as string, new Date().toISOString());
                setCurrentLessonId(res?.id || null);
            } catch (e) {
                setCurrentLessonId(null);
            }
        };

        fetchCurrentLesson();
        const interval = setInterval(fetchCurrentLesson, 60000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const drawer = (
        <Box
            sx={{
                height: "100%",
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.03)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
                py: 4,
                display: "flex",
                flexDirection: "column",
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            }}
        >
            {/* Logo and Slogan */}
            <Box px={3} mb={4} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(37, 115, 255, 0.2)'
                        }}
                    >
                        <SchoolIcon />
                    </Avatar>
                    <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{
                            cursor: "pointer",
                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                        onClick={() => navigate("/dashboard")}
                    >
                        {BRAND_NAME}
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        pl: 0.5,
                        fontStyle: "italic",
                        opacity: 0.8
                    }}
                >
                    Your personalized English journey
                </Typography>
            </Box>

            {/* Navigation */}
            <Box px={2} mb={2}>
                <Typography variant="overline" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
                    Main Navigation
                </Typography>
                <List
                    disablePadding
                    component={motion.ul}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {menuItems.map(({ label, icon, path }, index) => (
                        <ListItem key={label} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={motion.div}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                                whileHover={{ x: 5 }}
                                onClick={() => {
                                    navigate(path);
                                    setMobileOpen(false);
                                }}
                                selected={location.pathname === path}
                                sx={{
                                    borderRadius: 2,
                                    px: 2,
                                    py: 1.5,
                                    "&.Mui-selected": {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        "& .MuiListItemIcon-root": {
                                            color: 'primary.main',
                                        },
                                        "& .MuiListItemText-primary": {
                                            color: 'primary.main',
                                            fontWeight: 600
                                        }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36, color: location.pathname === path ? 'primary.main' : 'text.secondary' }}>
                                    {icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    primaryTypographyProps={{
                                        fontWeight: location.pathname === path ? 600 : 500,
                                        fontSize: '0.95rem'
                                    }}
                                />
                                {location.pathname === path && (
                                    <Box
                                        component={motion.div}
                                        layoutId="activeIndicator"
                                        sx={{
                                            width: 4,
                                            height: 20,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                            ml: 1
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* User Resources Section */}
            {isTeacher && (<Box px={2} mb={2}>
                <Typography variant="overline" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
                    Resources
                </Typography>
                <List
                    disablePadding
                    component={motion.ul}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            component={motion.div}
                            whileHover={{ x: 5 }}
                            onClick={() => {
                                navigate('/learning-materials');
                                setMobileOpen(false);
                            }}
                            selected={location.pathname === '/learning-materials'}
                            sx={{
                                borderRadius: 2,
                                px: 2,
                                py: 1.5,
                                "&.Mui-selected": {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    "& .MuiListItemIcon-root": {
                                        color: 'primary.main',
                                    },
                                    "& .MuiListItemText-primary": {
                                        color: 'primary.main',
                                        fontWeight: 600
                                    }
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36, color: location.pathname === '/learning-materials' ? 'primary.main' : 'text.secondary' }}>
                                <BookIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Learning Materials"
                                primaryTypographyProps={{
                                    fontWeight: location.pathname === '/learning-materials' ? 600 : 500,
                                    fontSize: '0.95rem'
                                }}
                            />
                            {location.pathname === '/learning-materials' && (
                                <Box
                                    component={motion.div}
                                    layoutId="activeIndicator"
                                    sx={{
                                        width: 4,
                                        height: 20,
                                        bgcolor: 'primary.main',
                                        borderRadius: 1,
                                        ml: 1
                                    }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            component={motion.div}
                            whileHover={{ x: 5 }}
                            onClick={() => {
                                navigate('/lesson-contents');
                                setMobileOpen(false);
                            }}
                            selected={location.pathname.startsWith('/lesson-contents')}
                            sx={{
                                borderRadius: 2,
                                px: 2,
                                py: 1.5,
                                "&.Mui-selected": {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    "& .MuiListItemIcon-root": {
                                        color: 'primary.main',
                                    },
                                    "& .MuiListItemText-primary": {
                                        color: 'primary.main',
                                        fontWeight: 600
                                    }
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36, color: location.pathname.startsWith('/lesson-contents') ? 'primary.main' : 'text.secondary' }}>
                                <GridViewIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Lesson Contents"
                                primaryTypographyProps={{
                                    fontWeight: location.pathname.startsWith('/lesson-contents') ? 600 : 500,
                                    fontSize: '0.95rem'
                                }}
                            />
                            {location.pathname.startsWith('/lesson-contents') && (
                                <Box
                                    component={motion.div}
                                    layoutId="activeIndicator"
                                    sx={{
                                        width: 4,
                                        height: 20,
                                        bgcolor: 'primary.main',
                                        borderRadius: 1,
                                        ml: 1
                                    }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>)}

            {/* Bottom footer with gradient card */}
            <Box mt="auto" px={3} mb={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                    © 2025 {BRAND_NAME}
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            <NotificationToasterWrapper/>
            <Box sx={{  display: 'flex', width: '100%', height: '100dvh', overflow: 'hidden' }}>
                <CssBaseline />
                {!isVideoCallPage && (<AppBar
                    position="fixed"
                    elevation={0}
                    sx={{
                        width: isVideoCallPage ? '100%' : { md: `calc(100% - ${drawerWidth}px)` },
                        ml: isVideoCallPage ? 0 : { md: `${drawerWidth}px` },
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        color: "text.primary",
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        zIndex: 1201,
                    }}
                >
                    <Toolbar sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {!isVideoCallPage && (
                                <IconButton
                                    color="inherit"
                                    edge="start"
                                    onClick={handleDrawerToggle}
                                    sx={{
                                        mr: 2,
                                        display: { md: "none" },
                                        color: 'primary.main'
                                    }}
                                >
                                    <MenuIcon />
                                </IconButton>
                            )}

                            {!isVideoCallPage && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    sx={{ display: { xs: 'none', sm: 'block' } }}
                                >
                                    <Typography
                                        variant="h6"
                                        fontWeight={600}
                                        sx={{
                                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            display: { xs: 'none', md: 'block' }
                                        }}
                                    >
                                        {BRAND_NAME}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 1, sm: 2 }
                            }}
                        >
                            <Tooltip title="Notifications">
                                <IconButton
                                    onClick={togglePanel}
                                    size="small"
                                    sx={{
                                        color: 'text.secondary',
                                        bgcolor: isPanelOpen ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <Badge
                                        color="error"
                                        variant="dot"
                                        invisible={notifications.every(n => n.isRead)}
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                boxShadow: '0 0 0 2px white'
                                            }
                                        }}
                                    >
                                        <NotificationsNoneIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>

                            {currentLessonId && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => navigate(`/lessons/${currentLessonId}`)}
                                >
                                    Join Lesson
                                </Button>
                            )}

                            {hasMounted && (
                                <Menu
                                    anchorReference="anchorPosition"
                                    anchorPosition={{ top: 60, left: window.innerWidth - 320 }}
                                    open={isPanelOpen}
                                    onClose={togglePanel}
                                    PaperProps={{
                                        elevation: 3,
                                        sx: {
                                            borderRadius: 3,
                                            mt: 1,
                                            bgcolor: "background.paper",
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            overflow: 'hidden'
                                        },
                                    }}
                                    TransitionComponent={ MotionDivTransition }
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            Notifications
                                        </Typography>
                                        <Box>
                                            <Tooltip title="Mark all as read">
                                                <IconButton
                                                    size="small"
                                                    onClick={handleMarkAllRead}
                                                    sx={{
                                                        color: 'primary.main',
                                                        mr: 0.5
                                                    }}
                                                >
                                                    <CheckIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Clear all">
                                                <IconButton
                                                    size="small"
                                                    onClick={handleClearAll}
                                                    sx={{
                                                        color: 'error.main'
                                                    }}
                                                >
                                                    <DeleteOutline fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    <MenuList sx={{ width: 380, px: 0, py: 0, overflow: 'auto', maxHeight: '60vh' }}>
                                        {notifications.length === 0 && (
                                            <Box
                                                sx={{
                                                    px: 2,
                                                    py: 4,
                                                    textAlign: "center",
                                                    color: "text.secondary",
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 1
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 60,
                                                        height: 60,
                                                        borderRadius: '50%',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mb: 1
                                                    }}
                                                >
                                                    <NotificationsNoneIcon sx={{ color: 'primary.main', fontSize: 30 }} />
                                                </Box>
                                                <Typography variant="subtitle2" fontWeight={500}>
                                                    No notifications
                                                </Typography>
                                                <Typography variant="body2">
                                                    You are all caught up!
                                                </Typography>
                                            </Box>
                                        )}

                                        {notifications.map((notif) => (
                                            <Box
                                                component={motion.div}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                key={notif.id}
                                                onClick={() => {
                                                    togglePanel();
                                                    handleMarkAsRead(notif.id);
                                                    if (notif.type === 'LESSON_RESCHEDULED') {
                                                        navigate(`/lessons/${notif.targetId}`);
                                                    }
                                                }}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 0.5,
                                                    px: 2,
                                                    py: 2,
                                                    cursor: 'pointer',
                                                    backgroundColor: notif.isRead ? alpha(theme.palette.background.default, 0.5) : '#fff',
                                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                                                    },
                                                    '&::before': notif.isRead ? {} : {
                                                        content: '""',
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 3,
                                                        backgroundColor: 'primary.main',
                                                        borderRadius: '0 2px 2px 0'
                                                    }
                                                }}
                                            >
                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="subtitle2" fontWeight={600} color={notif.isRead ? 'text.secondary' : 'text.primary'}>
                                                        {notif.title}
                                                    </Typography>
                                                    {!notif.isRead && (
                                                        <Box
                                                            component={motion.span}
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ duration: 0.2 }}
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                bgcolor: 'primary.main',
                                                                borderRadius: '50%',
                                                                ml: 1,
                                                                boxShadow: '0 0 0 2px white'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: notif.isRead ? 'text.secondary' : 'text.primary',
                                                        whiteSpace: 'normal',
                                                        wordBreak: 'break-word',
                                                        opacity: notif.isRead ? 0.8 : 1
                                                    }}
                                                >
                                                    {notif.body}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </MenuList>
                                </Menu>
                            )}

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    ml: 1,
                                    background: alpha(theme.palette.primary.main, 0.05),
                                    py: 0.5,
                                    px: { xs: 1, sm: 2 },
                                    borderRadius: 6
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 500,
                                        display: { xs: 'none', sm: 'block' }
                                    }}
                                >
                                    {user?.name || "Tutor"}
                                </Typography>

                                <Avatar
                                    src={user?.avatar}
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        border: '2px solid white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }
                                    }}
                                    onClick={handleProfileMenuOpen}
                                />

                                <Menu
                                    anchorEl={profileAnchorEl}
                                    open={isProfileMenuOpen}
                                    onClose={handleProfileMenuClose}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                                    PaperProps={{
                                        elevation: 3,
                                        sx: {
                                            mt: 1.5,
                                            borderRadius: 2,
                                            minWidth: 180,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                            '& .MuiMenuItem-root': {
                                                py: 1.5
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {user?.name || "Tutor"}
                                        </Typography>
                                    </Box>

                                    <MenuItem
                                        onClick={handleProfile}
                                        sx={{
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                '& .MuiSvgIcon-root': {
                                                    color: 'primary.main'
                                                }
                                            }
                                        }}
                                    >
                                        <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                                        <Typography variant="body2">My Profile</Typography>
                                    </MenuItem>

                                    <MenuItem
                                        onClick={openDialog}
                                        sx={{
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.error.main, 0.08),
                                                '& .MuiSvgIcon-root': {
                                                    color: 'error.main'
                                                }
                                            }
                                        }}
                                    >
                                        <LogoutIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                                        <Typography variant="body2">Logout</Typography>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </Box>
                    </Toolbar>
                </AppBar>)}

                {!isVideoCallPage && (
                    <>
                        <Drawer
                            variant="temporary"
                            open={mobileOpen}
                            onClose={handleDrawerToggle}
                            ModalProps={{ keepMounted: true }}
                            sx={{
                                display: { xs: "block", md: "none" },
                                "& .MuiDrawer-paper": {
                                    boxSizing: "border-box",
                                    width: drawerWidth,
                                    top: (theme) => theme.mixins.toolbar.minHeight,
                                    height: (theme) => `calc(100% - ${theme.mixins.toolbar.minHeight}px)`,
                                    position: 'fixed'
                                },
                            }}
                        >
                            {drawer}
                        </Drawer>

                        <Drawer
                            variant="permanent"
                            sx={{
                                display: { xs: "none", md: "block" },
                                width: drawerWidth,
                                flexShrink: 0,
                                "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
                            }}
                            open
                        >
                            {drawer}
                        </Drawer>
                    </>
                )}

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                        minHeight: 0,
                        pt: isMobile ? `${theme.mixins.toolbar.minHeight}px` : isVideoCallPage ? '0' : '64px',
                        background: `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
                        position: 'relative',
                        width: isVideoCallPage ? '100%' : 'auto',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -100,
                            right: -100,
                            width: 300,
                            height: 300,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0)} 70%)`,
                            zIndex: 0,
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -100,
                            left: -100,
                            width: 300,
                            height: 300,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.light, 0.08)} 0%, ${alpha(theme.palette.secondary.light, 0)} 70%)`,
                            zIndex: 0,
                        },
                    }}
                >
                    {/* Logout Confirmation Dialog */}
                    <Dialog
                        open={isDialogOpen}
                        onClose={closeDialog}
                        PaperProps={{
                            elevation: 3,
                            sx: {
                                borderRadius: 3,
                                overflow: 'hidden'
                            }
                        }}
                    >
                        <DialogTitle sx={{
                            py: 2.5,
                            px: 3,
                            bgcolor: alpha(theme.palette.error.main, 0.05),
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                            <Typography variant="h6" fontWeight={600}>Confirm Logout</Typography>
                        </DialogTitle>
                        <DialogContent sx={{ py: 3, px: 3 }}>
                            <Typography variant="body1">
                                Are you sure you want to log out of your account?
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                            <Button
                                onClick={closeDialog}
                                variant="outlined"
                                sx={{
                                    borderRadius: 2,
                                    px: 3
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleLogout}
                                variant="contained"
                                color="error"
                                sx={{
                                    borderRadius: 2,
                                    px: 3
                                }}
                            >
                                Logout
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Main Content Wrapper */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            flexGrow: 1,
                            overflowX: 'hidden',
                            overflowY: 'hidden',
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </>
    );
};

export default MainLayout;
