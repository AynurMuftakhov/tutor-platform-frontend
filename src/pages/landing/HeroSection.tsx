import React from 'react';
import { Box, Button, Container, Typography, useMediaQuery, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import {Link, useNavigate} from 'react-router-dom';
import { keycloak } from '../../services/keycloak';

const HeroSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
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
            gap: 4,
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
              transition={{ duration: 0.5 }}
            >
              <Typography
                variant="h1"
                component="h1"
                gutterBottom
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: { xs: '2.5rem', md: '3rem' },
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
              transition={{ duration: 0.5, delay: 0.2 }}
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
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  component={Link}
                  to="/book-trial"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Book a Free Trial
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                  }}
                >
                  Log In
                </Button>
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
              justifyContent: 'center'
            }}
          >
            <Box
              component="img"
              src="/assets/hero.jpg"
              alt="Sabina teaching English"
              sx={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 4,
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                transform: 'rotate(2deg)',
              }}
              loading="lazy"
              srcSet="/assets/hero-small.jpg 600w, /assets/hero.jpg 1200w"
              sizes="(max-width: 600px) 100vw, 50vw"
            />
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
