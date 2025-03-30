import React, { useState } from "react";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    CssBaseline, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
    Badge,
    MenuList
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import EventNoteIcon from "@mui/icons-material/EventNote";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const drawerWidth = 240;
const BRAND_NAME = "Tutoria";
const SLOGAN = "Your personalized English journey";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
    const hasNotifications = true; // Mock this, connect real logic later
    const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
    const isProfileMenuOpen = Boolean(profileAnchorEl);

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { text: "Dashboard", icon: <HomeIcon />, path: "/dashboard" },
        { text: "Students", icon: <PeopleIcon />, path: "/my-students" },
        { text: "Schedule", icon: <EventNoteIcon />, path: "/schedule" },
    ];

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setProfileAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setProfileAnchorEl(null);
    };

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

    const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
        setNotifAnchorEl(event.currentTarget);
    };

    const handleNotifClose = () => {
        setNotifAnchorEl(null);
    };

    const drawer = (
        <Box
            sx={{
                height: "100%",
                backgroundColor: "#F3F6FD",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Logo & Slogan */}
            <Box sx={{ textAlign: "center", p: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => navigate("/dashboard")}
                >
                    {BRAND_NAME}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontStyle: "italic" }}
                >
                    {SLOGAN}
                </Typography>
            </Box>

            <Divider />

            {/* Navigation */}
            <Box sx={{ flexGrow: 1 }}>
                <List>
                    {menuItems.map(({ text, icon, path }) => (
                        <ListItem key={text} disablePadding>
                            <ListItemButton onClick={() => navigate(path)}>
                                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                                <ListItemText primary={text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Bottom Branding */}
            <Divider />
            <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                    © 2025 {BRAND_NAME}
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />

            {/* Top Bar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    backgroundColor: "#56adda",
                }}
                elevation={0}
            >
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    {/* Burger (mobile only) */}
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: "none" } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Title left-aligned (optional) */}
                    <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                        {BRAND_NAME}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {/* Notification Bell */}
                        <IconButton onClick={handleNotifOpen} size="small" color="inherit">
                            <Badge color="error" variant="dot" invisible={!hasNotifications}>
                                <NotificationsNoneIcon />
                            </Badge>
                        </IconButton>

                        <Menu
                            anchorEl={notifAnchorEl}
                            open={Boolean(notifAnchorEl)}
                            onClose={handleNotifClose}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                        >
                            <MenuList sx={{ width: 250 }}>
                                <MenuItem onClick={handleNotifClose}>
                                    <ListItemText primary="Next lesson in 30 mins" secondary="Today at 14:00" />
                                </MenuItem>
                                <MenuItem onClick={handleNotifClose}>
                                    <ListItemText primary="Homework submitted" secondary="By Anna Petrova" />
                                </MenuItem>
                            </MenuList>
                        </Menu>

                        {/* Profile Menu */}
                        <Typography variant="body1" sx={{ color: "#fff" }}>
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

            {/* Drawer */}
            <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                {/* Mobile */}
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

                {/* Desktop */}
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

            {/* Content */}
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
                    <DialogContent>
                        Are you sure you want to log out?
                    </DialogContent>
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
    );
};

export default MainLayout;