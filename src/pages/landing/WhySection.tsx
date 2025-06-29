import React, { useState } from 'react';
import { Box, Card, CardContent, Container, Grid, Typography, useTheme } from '@mui/material';
import { motion, useMotionTemplate, useSpring } from 'framer-motion';
import { platformFeatures } from '../../data/sample-data';
import PersonIcon from '@mui/icons-material/Person';
import InsightsIcon from '@mui/icons-material/Insights';
import VideocamIcon from '@mui/icons-material/Videocam';

// Feature card with 3D tilt effect
interface FeatureCardProps {
  children: React.ReactNode;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ children, index }) => {
  const theme = useTheme();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Skip tilt effect if user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          boxShadow: theme.shadows[2],
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {children}
      </Card>
    );
  }

  // For users who don't mind motion, add the 3D tilt effect
  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation (max 4 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXValue = ((y - centerY) / centerY) * -4;
    const rotateYValue = ((x - centerX) / centerX) * 4;

    rotateX.set(rotateXValue);
    rotateY.set(rotateYValue);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

  return (
    <motion.div
      style={{ 
        transform,
        height: '100%',
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          boxShadow: theme.shadows[2],
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {children}
      </Card>
    </motion.div>
  );
};

// Fallback to static icons if Lottie animations aren't available
const WhySection: React.FC = () => {
  const theme = useTheme();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getIconComponent = (iconName: string) => {
    // Fallback to static icons
    switch (iconName) {
      case 'PersonalizedIcon':
        return <PersonIcon fontSize="large" color="primary" />;
      case 'ProgressIcon':
        return <InsightsIcon fontSize="large" color="primary" />;
      case 'VideoIcon':
        return <VideocamIcon fontSize="large" color="primary" />;
      default:
        return <PersonIcon fontSize="large" color="primary" />;
    }
  };

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.default,
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
            Why Speakshire Works
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            My methodology combines personalized attention with cutting-edge technology
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {platformFeatures.map((feature, index) => (
            <Grid size={{xs:12, md:4}} key={feature.id}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <FeatureCard index={index}>
                  <CardContent sx={{ flexGrow: 1, p: 4 }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                      {getIconComponent(feature.icon)}
                    </Box>
                    <Typography
                      gutterBottom
                      variant="h5"
                      component="h3"
                      sx={{ fontWeight: 600, textAlign: 'center', mb: 2 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default WhySection;
