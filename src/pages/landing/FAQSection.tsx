import React from 'react';
import { Box, Container, Typography, useTheme, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { faqItems } from '../../data/sample-data';

const FAQSection: React.FC = () => {
  const theme = useTheme();

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
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Find answers to common questions about Speakshire
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Accordion
                sx={{
                  mb: 2,
                  boxShadow: 'none',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '12px !important',
                  '&:before': {
                    display: 'none',
                  },
                  '&.Mui-expanded': {
                    boxShadow: theme.shadows[2],
                    borderColor: 'transparent',
                  },
                  overflow: 'hidden',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: theme.palette.background.paper,
                    '&.Mui-expanded': {
                      backgroundColor: theme.palette.background.paper,
                    },
                  }}
                >
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" color="textSecondary">
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default FAQSection;