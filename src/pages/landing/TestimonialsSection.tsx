import React, { useEffect, useState } from 'react';
import { Box, Card, Container, Typography, Avatar, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { testimonials } from '../../data/sample-data';

const TestimonialsSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.paper,
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
            What Our Students Say
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Join hundreds of satisfied learners who have transformed their English skills
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              overflowX: isMobile ? 'auto' : 'visible',
              py: 2,
              px: isMobile ? 2 : 0,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              gap: 3,
              justifyContent: isMobile ? 'flex-start' : 'center',
            }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                style={{ 
                  minWidth: isMobile ? '85%' : '350px',
                  maxWidth: isMobile ? '85%' : '350px',
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 3,
                    borderRadius: 4,
                    boxShadow: index === activeIndex ? theme.shadows[4] : theme.shadows[1],
                    border: index === activeIndex ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    transform: index === activeIndex ? 'scale(1.03)' : 'scale(1)',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'scale(1.03)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                    <Avatar
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      sx={{ width: 56, height: 56, mr: 2 }}
                    />
                    <Box>
                      <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {testimonial.country} {testimonial.flag}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      fontStyle: 'italic',
                      mb: 2,
                      flexGrow: 1,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    &ldquo;{testimonial.quote}&rdquo;
                  </Typography>
                </Card>
              </motion.div>
            ))}
          </Box>

          {/* Pagination dots for mobile */}
          {isMobile && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              {testimonials.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    mx: 0.5,
                    backgroundColor: index === activeIndex ? theme.palette.primary.main : theme.palette.grey[300],
                    transition: 'background-color 0.3s ease',
                  }}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default TestimonialsSection;
