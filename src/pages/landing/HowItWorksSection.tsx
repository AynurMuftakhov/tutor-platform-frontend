import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, useTheme, useMediaQuery, Stepper, Step, StepLabel, StepContent, StepIcon, StepIconProps } from '@mui/material';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { howItWorksSteps } from '../../data/sample-data';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Custom StepIcon component with animated check mark
const CustomStepIcon: React.FC<StepIconProps> = (props) => {
  const { active, completed, icon } = props;
  const theme = useTheme();
  const controls = useAnimation();
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (completed && !hasAnimated && !prefersReducedMotion) {
      // Start animation after 1 second delay
      const timer = setTimeout(() => {
        controls.start({
          scale: [1, 1.2, 1],
          opacity: 1,
          transition: { duration: 0.5 }
        });
        setHasAnimated(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (completed) {
      // For users who prefer reduced motion or after animation
      controls.set({ opacity: 1 });
    }
  }, [completed, controls, hasAnimated, prefersReducedMotion]);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {/* Number circle */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: active 
            ? theme.palette.primary.main 
            : completed 
              ? theme.palette.secondary.main 
              : theme.palette.grey[300],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          zIndex: 1,
          transition: 'background-color 0.3s ease',
        }}
      >
        {completed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={controls}
          >
            <CheckCircleIcon />
          </motion.div>
        ) : (
          <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
            {icon}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const HowItWorksSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(-1);

  // Track which steps are in viewport for animations
  const handleStepInView = (index: number, inView: boolean) => {
    if (inView && activeStep < index) {
      setActiveStep(index);
    }
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
            activeStep={activeStep}
            sx={{
              '& .MuiStepConnector-line': {
                borderColor: theme.palette.primary.light,
                transition: 'border-color 0.3s ease',
              },
              '& .MuiStepLabel-label': {
                mt: 1,
              },
            }}
          >
            {howItWorksSteps.map((step, index) => (
              <Step 
                key={step.step} 
                completed={index <= activeStep}
              >
                <StepLabel StepIconComponent={CustomStepIcon}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        duration: 0.5, 
                        delay: index * 0.2 
                      }
                    }}
                    onViewportEnter={() => handleStepInView(index, true)}
                    viewport={{ once: true, amount: 0.6 }}
                  >
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 1,
                        color: index <= activeStep ? theme.palette.text.primary : theme.palette.text.secondary,
                      }}
                    >
                      {step.title}
                    </Typography>
                  </motion.div>
                </StepLabel>

                {/* Description - only shown once */}
                {isMobile ? (
                  <StepContent>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { 
                          duration: 0.5, 
                          delay: index * 0.2 + 0.1 
                        }
                      }}
                      viewport={{ once: true }}
                    >
                      <Typography color="textSecondary" sx={{ mb: 2 }}>
                        {step.description}
                      </Typography>
                    </motion.div>
                  </StepContent>
                ) : (
                  <Box sx={{ mt: 2, textAlign: 'center', maxWidth: 200, mx: 'auto' }}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { 
                          duration: 0.5, 
                          delay: index * 0.2 + 0.1 
                        }
                      }}
                      viewport={{ once: true }}
                    >
                      <Typography 
                        color="textSecondary"
                        variant="body2"
                        sx={{
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                        }}
                      >
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
                to="/contact-us"
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
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HowItWorksSection;
