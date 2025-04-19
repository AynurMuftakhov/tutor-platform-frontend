import React, { useState, useEffect } from "react";
import {
    AppBar, Avatar, Badge, Box, Button, CssBaseline, Dialog, DialogActions, DialogContent,
    DialogTitle, Drawer, IconButton, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Toolbar, Typography
} from "@mui/material";

import {
    markNotificationAsRead,
    deleteNotificationById,
    markAllNotificationsAsRead,
    clearAllNotifications,
    fetchNotifications
} from "../services/api";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import EventNoteIcon from "@mui/icons-material/EventNote";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CheckIcon from "@mui/icons-material/Check";

import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import {useNotificationSocket} from "../context/NotificationsSocketContext";
import NotificationToasterWrapper from "../components/NotificationToasterWrapper";
import {DeleteOutline} from "@mui/icons-material";

const drawerWidth = 240;
const BRAND_NAME = "Tutoria";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
    const { notifications, isPanelOpen, togglePanel, setNotifications } = useNotificationSocket();
    const [hasMounted, setHasMounted] = useState(false);

    const isProfileMenuOpen = Boolean(profileAnchorEl);

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: "Dashboard", icon: <HomeIcon />, path: "/dashboard" },
        ...(user?.role === "tutor"
            ? [{ label: "Students", icon: <PeopleIcon />, path: "/my-students" },
                { label: "Vocabulary", icon: <EventNoteIcon />, path: "/vocabulary" }]
            : [ { label: "Vocabulary", icon: <EventNoteIcon />, path: `/students/${user?.id}/vocabulary` }]),
        { label: "Lessons", icon: <EventNoteIcon />, path: "/lessons" }
    ];

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
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

    const handleDeleteNotification = async (id: string) => {
        try {
            await deleteNotificationById(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to delete notification", error);
        }
    };

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const drawer = (
        <Box
            sx={{
                height: "100%",
                backgroundColor: "#F9FAFC",
                py: 3,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Logo and Slogan */}
            <Box px={2} mb={2}>
                <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ textAlign: "left", pl: 1, cursor: "pointer" }}
                    onClick={() => navigate("/dashboard")}
                >
                    {BRAND_NAME}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontStyle: "italic" }}>
                    Your personalized English journey
                </Typography>
            </Box>

            {/* Navigation (stick to top) */}
            <List disablePadding>
                {menuItems.map(({ label, icon, path }) => (
                    <ListItem key={label} disablePadding>
                        <ListItemButton
                            onClick={() => navigate(path)}
                            selected={location.pathname === path}
                            sx={{
                                mx: 1,
                                my: 0.5,
                                borderRadius: 2,
                                px: 2,
                                py: 1.5,
                                "&.Mui-selected": {
                                    backgroundColor: "#E3F2FD",
                                    "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
                                        color: "#1976d2"
                                    }
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 500 }} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* Bottom footer (optional) */}
            <Box mt="auto" px={2}>
                <Typography variant="caption" color="text.secondary">
                    © 2025 {BRAND_NAME}
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            <NotificationToasterWrapper/>
            <Box sx={{ display: "flex" }}>
                <CssBaseline />

                <AppBar
                    position="fixed"
                    sx={{
                        width: { md: `calc(100% - ${drawerWidth}px)` },
                        ml: { md: `${drawerWidth}px` },
                        backgroundColor: "#ffffff",
                        color: "#000",
                        boxShadow: "0px 1px 4px rgba(0,0,0,0.05)",
                        zIndex: 1201,
                    }}
                >
                    <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography variant="h6" fontWeight={600}>
                            {BRAND_NAME}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <IconButton onClick={togglePanel} size="small" color="inherit">
                                <Badge color="error" variant="dot" invisible={notifications.every(n => n.isRead)}>
                                    <NotificationsNoneIcon />
                                </Badge>
                            </IconButton>
                            {hasMounted && (
                                <Menu
                                    anchorReference="anchorPosition"
                                    anchorPosition={{ top: 60, left: window.innerWidth - 270 }}
                                    open={isPanelOpen}
                                    onClose={togglePanel}
                                    PaperProps={{
                                        elevation: 3,
                                        sx: {
                                            borderRadius: 2,
                                            mt: 1,
                                            bgcolor: "background.paper",
                                        },
                                    }}
                                >
                                    <MenuList sx={{ width: 360, px: 0, py: 1, overflow: 'auto', maxHeight: '80vh' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} mb={1}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={handleMarkAllRead}
                                                sx={{ fontWeight: 500, color: '#1976d2', textTransform: 'none' }}
                                                startIcon={<CheckIcon />}
                                            >
                                                Mark all as read
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={handleClearAll}
                                                sx={{ fontWeight: 500, color: '#d32f2f', textTransform: 'none' }}
                                                startIcon={<DeleteOutline />}
                                            >
                                                Clear all
                                            </Button>
                                        </Box>

                                        {notifications.length === 0 && (
                                            <Box px={2} py={1} textAlign="center" color="text.secondary">
                                                No notifications
                                            </Box>
                                        )}

                                        {notifications.map((notif) => (
                                            <Box
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
                                                    py: 1.5,
                                                    cursor: 'pointer',
                                                    backgroundColor: notif.isRead ? '#fafafa' : '#fff',
                                                    borderBottom: '1px solid #eee',
                                                    '&:hover': {
                                                        backgroundColor: '#f5f5f5',
                                                    },
                                                }}
                                            >
                                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {notif.title}
                                                    </Typography>
                                                    {!notif.isRead && (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                bgcolor: 'primary.main',
                                                                borderRadius: '50%',
                                                                ml: 1
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        whiteSpace: 'normal',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {notif.body}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </MenuList>
                                </Menu>
                                )}

                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {user?.name || "Tutor"}
                            </Typography>
                            <IconButton onClick={handleProfileMenuOpen} size="small">
                                <Avatar src={user?.avatar} sx={{ width: 36, height: 36 }} />
                            </IconButton>

                            <Menu
                                anchorEl={profileAnchorEl}
                                open={isProfileMenuOpen}
                                onClose={handleProfileMenuClose}
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                transformOrigin={{ vertical: "top", horizontal: "right" }}
                            >
                                <MenuItem onClick={handleProfile}>
                                    <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                                    My Profile
                                </MenuItem>
                                <MenuItem onClick={openDialog}>
                                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                                    Logout
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </AppBar>

                <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            display: { xs: "block", md: "none" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
                        }}
                    >
                        {drawer}
                    </Drawer>

                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: "none", md: "block" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
                        }}
                        open
                    >
                        {drawer}
                    </Drawer>
                </Box>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 2, sm: 3 },
                        width: { md: `calc(100% - ${drawerWidth}px)` },
                        mt: 8,
                        backgroundColor: "#F9FAFB",
                        minHeight: "100vh",
                    }}
                >
                    <Dialog open={isDialogOpen} onClose={closeDialog}>
                        <DialogTitle>Confirm Logout</DialogTitle>
                        <DialogContent>Are you sure you want to log out?</DialogContent>
                        <DialogActions>
                            <Button onClick={closeDialog}>Cancel</Button>
                            <Button onClick={handleLogout} color="primary">
                                Logout
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {children}
                </Box>
            </Box>
    </>
    );
};

export default MainLayout;