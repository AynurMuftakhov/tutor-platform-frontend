import React, { useState } from 'react';
import { Box, Container, Typography, useTheme, Dialog, IconButton, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';

const screenshots = [
  {
    id: 'dashboard',
    src: '/assets/screens/dashboard.jpg',
    alt: 'Student Dashboard',
    caption: 'Student Dashboard - Track your progress and upcoming lessons'
  },
  {
    id: 'lessons-schedule',
    src: '/assets/screens/lessons-schedule.jpg',
    alt: 'Lesson Room',
    caption: 'Lesson Schedule - Interactive schedule to track your lessons'
  }
];

const SneakPeekSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleOpenLightbox = (src: string) => {
    setSelectedImage(src);
  };

  const handleCloseLightbox = () => {
    setSelectedImage(null);
  };

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.grey[50],
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
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
            Platform Sneak Peek
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Get a glimpse of the intuitive interface that makes learning English enjoyable
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {screenshots.map((screenshot, index) => (
            <motion.div
              key={screenshot.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
              style={{ width: isMobile ? '100%' : '45%' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 4,
                  boxShadow: theme.shadows[3],
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: theme.shadows[6],
                  },
                }}
                onClick={() => handleOpenLightbox(screenshot.src)}
              >
                <Box
                  component="img"
                  src={screenshot.src}
                  alt={screenshot.alt}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  loading="lazy"
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: 2,
                  }}
                >
                  <Typography variant="body2">{screenshot.caption}</Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>

        <Dialog
          open={!!selectedImage}
          onClose={handleCloseLightbox}
          maxWidth="lg"
          fullWidth
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
              onClick={handleCloseLightbox}
            >
              <CloseIcon />
            </IconButton>
            {selectedImage && (
              <Box
                component="img"
                src={selectedImage}
                alt="Screenshot"
                sx={{
                  width: '100%',
                  height: 'auto',
                }}
              />
            )}
          </Box>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SneakPeekSection;