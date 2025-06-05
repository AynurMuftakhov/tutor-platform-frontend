import React from 'react';
import { Box, Button, Container, Typography, useMediaQuery, useTheme, alpha, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField } from '@mui/material';
import { motion } from 'framer-motion';
import {Link, useNavigate} from 'react-router-dom';
import { keycloak } from '../../services/keycloak';

const HeroSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [open, setOpen] = React.useState(false);
  const handleOpenContactDialog = () => setOpen(true);
  const handleCloseContactDialog = () => setOpen(false);

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundImage: 'url("/assets/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: theme.palette.background.default, // fallback
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 6, md: 4 },
            pt: { xs: 2, md: 0 },
          }}
        >
          <Box
            sx={{
              maxWidth: { xs: '100%', md: '50%' },
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Typography
                variant="h1"
                component="h1"
                gutterBottom
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                }}
              >
                Learn English with Sabina on Speakshire
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Typography
                variant="h5"
                component="p"
                color="textSecondary"
                sx={{ mb: 4, lineHeight: 1.6 }}
              >
                A private, student-centred platform for confident, fluent English.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleOpenContactDialog}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Contact with Us
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={() => keycloak.login({ redirectUri: window.location.origin + '/dashboard' })}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontSize: '1rem',
                    }}
                  >
                    Log In
                  </Button>
                </motion.div>
              </Box>
            </motion.div>
          </Box>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              width: isMobile ? '100%' : '45%',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Floating ribbon badge */}
            <Box
              sx={{
                position: 'absolute',
                top: '10px',
                right: { xs: '10px', md: '-10px' },
                zIndex: 2,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                py: 1,
                px: 2,
                borderRadius: '0 8px 8px 0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-12px',
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                  borderWidth: '0 12px 32px 0',
                  borderColor: `transparent ${theme.palette.primary.main} transparent transparent`,
                }
              }}
            >
              Trusted by 120+ learners
            </Box>

            <Box
              component="img"
              src="/assets/hero.webp"
              alt="Sabina teaching English"
              sx={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 4,
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                transform: 'rotate(2deg)',
              }}
              loading="lazy"
              srcSet="/assets/hero-small.webp 600w, /assets/hero.webp 1200w"
              sizes="(max-width: 768px) 80vw, 40vw"
            />
          </motion.div>
        </Box>
        <Dialog open={open} onClose={handleCloseContactDialog}>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please leave your contact information and a short message.
              We’ll get back to you as soon as possible!
            </DialogContentText>
            <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField autoFocus label="Your Name" fullWidth />
              <TextField label="Email Address" type="email" fullWidth />
              <TextField label="Message" multiline rows={4} fullWidth />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseContactDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleCloseContactDialog}>Send</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default HeroSection;
