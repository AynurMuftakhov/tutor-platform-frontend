import React from 'react';
import { Box, Button, Card, CardContent, Container, Grid, List, ListItem, ListItemIcon, ListItemText, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { pricingOptions } from '../../data/sample-data';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const PricingSnapshotSection: React.FC = () => {
  const theme = useTheme();

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
            Pricing Snapshot
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Transparent pricing with no hidden fees
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {pricingOptions.map((option, index) => (
            <Grid item xs={12} md={6} key={option.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: option.popular ? theme.shadows[10] : theme.shadows[2],
                    border: option.popular ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  {option.popular && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: 24,
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        py: 0.5,
                        px: 2,
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Most Popular
                    </Box>
                  )}
                  <CardContent sx={{ p: 4, flexGrow: 1 }}>
                    <Typography variant="h4" component="h3" gutterBottom sx={{ fontWeight: 700 }}>
                      {option.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                      <Typography variant="h3" component="span" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        ${option.price}
                      </Typography>
                      <Typography variant="subtitle1" component="span" sx={{ ml: 1, color: theme.palette.text.secondary }}>
                        / {option.duration}
                      </Typography>
                    </Box>

                    <List disablePadding>
                      {option.features.map((feature, idx) => (
                        <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <CheckCircleOutlineIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Button
              variant="outlined"
              color="primary"
              size="large"
              component={Link}
              to="/pricing"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              See Full Pricing
            </Button>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default PricingSnapshotSection;