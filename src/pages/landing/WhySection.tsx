import React from 'react';
import { Box, Card, CardContent, Container, Grid, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { platformFeatures } from '../../data/sample-data';
import PersonIcon from '@mui/icons-material/Person';
import InsightsIcon from '@mui/icons-material/Insights';
import VideocamIcon from '@mui/icons-material/Videocam';

const WhySection: React.FC = () => {
  const theme = useTheme();

  const getIconComponent = (iconName: string) => {
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
            <Grid item xs={12} md={4} key={feature.id}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
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
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default WhySection;