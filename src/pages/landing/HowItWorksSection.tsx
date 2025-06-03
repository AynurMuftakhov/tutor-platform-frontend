import React from 'react';
import { Box, Button, Container, Typography, useTheme, useMediaQuery, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { howItWorksSteps } from '../../data/sample-data';

const HowItWorksSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
            How It Works
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Getting started with Speakshire is simple and straightforward
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: 800,
            mx: 'auto',
          }}
        >
          <Stepper
            orientation={isMobile ? 'vertical' : 'horizontal'}
            alternativeLabel={!isMobile}
            sx={{
              '& .MuiStepConnector-line': {
                borderColor: theme.palette.primary.light,
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: theme.palette.primary.main,
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: theme.palette.secondary.main,
              },
            }}
          >
            {howItWorksSteps.map((step, index) => (
              <Step key={step.step} completed={true}>
                <StepLabel>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    viewport={{ once: true }}
                  >
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                      {step.title}
                    </Typography>
                  </motion.div>
                </StepLabel>
                <StepContent>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.2 + 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Typography color="textSecondary" sx={{ mb: 2 }}>
                      {step.description}
                    </Typography>
                  </motion.div>
                </StepContent>
                {!isMobile && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 + 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Typography color="textSecondary">
                        {step.description}
                      </Typography>
                    </motion.div>
                  </Box>
                )}
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true }}
            >
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
            </motion.div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HowItWorksSection;