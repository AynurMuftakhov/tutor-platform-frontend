import React from 'react';
import { Box, Container, Typography, Avatar, Button, Chip, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const BioSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Box
              sx={{
                position: 'relative',
                width: { xs: 200, md: 240 },
                height: { xs: 200, md: 240 },
                borderRadius: '50%',
                overflow: 'hidden',
                border: `4px solid ${theme.palette.primary.main}`,
                boxShadow: theme.shadows[4],
              }}
            >
              <Box
                component="img"
                src="/assets/sabina_circle.jpg"
                alt="Sabina - English Tutor"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                }}
                loading="lazy"
                srcSet="/assets/sabina_circle.jpg 400w, /assets/sabina_circle.jpg 800w"
                sizes="(max-width: 600px) 200px, 240px"
              />
            </Box>
          </motion.div>

          <Box
            sx={{
              maxWidth: 600,
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Typography
                component="h2"
                variant="h2"
                gutterBottom
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                }}
              >
                Meet Sabina
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Typography variant="body1" paragraph sx={{ mb: 2 }}>
                With over 18 years of experience teaching English to students from around the world,
                I&apos;m passionate about creating personalized learning experiences that build confidence 
                and fluency. My teaching approach focuses on practical communication skills while 
                ensuring a strong foundation in grammar and vocabulary.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 3,
                  justifyContent: isMobile ? 'center' : 'flex-start',
                }}
              >
                <Chip
                  label="TESOL Certified"
                  color="primary"
                  variant="outlined"
                  aria-label="Qualification: TESOL Certified"
                  sx={{ 
                    fontWeight: 500,
                    '&:hover': {
                      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                    }
                  }}
                />
                <Chip
                  label="18+ Years Experience"
                  color="primary"
                  variant="outlined"
                  aria-label="Experience: More than 18 years teaching English"
                  sx={{ 
                    fontWeight: 500,
                    '&:hover': {
                      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                    }
                  }}
                />
                <Chip
                  label="Business English"
                  color="primary"
                  variant="outlined"
                  aria-label="Specialization: Business English"
                  sx={{ 
                    fontWeight: 500,
                    '&:hover': {
                      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                    }
                  }}
                />
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.secondary.light, 0.1),
                  mb: 3,
                }}
              >
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Fun fact: I speak four languages and have lived in six different countries!
                </Typography>
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Button
                variant="outlined"
                color="primary"
                startIcon={<LinkedInIcon />}
                href="https://www.linkedin.com/in/sabina-shekhmametyeva-490604232"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Connect on LinkedIn
              </Button>
            </motion.div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default BioSection;
