import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  alpha
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { motion, useScroll, useTransform } from 'framer-motion';
import { keycloak } from '../../services/keycloak';

const navLinks = [
  { title: 'Why Speakshire', path: '#why-speakshire' },
  { title: 'Pricing', path: '#pricing' },
  { title: 'FAQ', path: '#faq' }
];

const Navigation: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  // Transform opacity and background based on scroll position
  const navbarOpacity = useTransform(scrollY, [0, 80], [0.9, 1]);
  const navbarBg = useTransform(
    scrollY,
    [0, 80],
    [
      `rgba(255, 255, 255, 0.7)`,
      theme.palette.background.paper
    ]
  );
  const navbarShadow = useTransform(
    scrollY,
    [0, 80],
    ['none', theme.shadows[1]]
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Close drawer when clicking a link on mobile
  const handleLinkClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  // Handle smooth scroll to section when clicking anchor links
  const scrollToSection = (sectionId: string) => {
    handleLinkClick();
    const element = document.querySelector(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const drawer = (
    <Box sx={{ width: 250, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <IconButton onClick={handleDrawerToggle} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>
      <List>
        {navLinks.map((link) => (
          <ListItem
            key={link.title}
            onClick={() => link.path.startsWith('#')
              ? scrollToSection(link.path)
              : handleLinkClick()
            }
            {...(link.path.startsWith('#')
              ? { component: 'button' as const }
              : { component: RouterLink, to: link.path })}
            sx={{
              borderRadius: 2,
              mb: 1,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08)
              }
            }}
          >
            <ListItemText
              primary={link.title}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItem>
        ))}
        <ListItem sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={() => keycloak.login({ redirectUri: window.location.origin + '/dashboard' })}
            sx={{
              py: 1,
              fontWeight: 500,
              borderRadius: 2,
            }}
          >
            Log In
          </Button>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          opacity: navbarOpacity,
          backgroundColor: navbarBg,
          boxShadow: navbarShadow,
          backdropFilter: 'blur(8px)',
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: 'transparent',
            height: 64,
          }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ height: 64 }}>
              {/* Logo */}
              <Typography
                variant="h5"
                component={RouterLink}
                to="/"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  textDecoration: 'none',
                  flexGrow: 1,
                }}
              >
                Speakshire
              </Typography>

              {/* Desktop Navigation */}
              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {navLinks.map((link) => (
                    <Button
                      key={link.title}
                      color="inherit"
                      sx={{
                        mx: 1,
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                      component={link.path.startsWith('#') ? 'button' : RouterLink}
                      to={!link.path.startsWith('#') ? link.path : undefined}
                      onClick={() => link.path.startsWith('#') && scrollToSection(link.path)}
                    >
                      {link.title}
                    </Button>
                  ))}
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => keycloak.login({ redirectUri: window.location.origin + '/dashboard' })}
                    sx={{
                      ml: 1.5,
                      px: 3,
                      py: 0.75,
                      fontWeight: 500,
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)'
                      }
                    }}
                  >
                    Log In
                  </Button>
                </Box>
              )}

              {/* Mobile Navigation Toggle */}
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="end"
                  onClick={handleDrawerToggle}
                  sx={{ color: theme.palette.text.primary }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Toolbar>
          </Container>
        </AppBar>
      </motion.div>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            borderRadius: '16px 0 0 16px',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Spacer to compensate for fixed navbar */}
      <Box sx={{ height: 64 }} />
    </>
  );
};

export default Navigation;
