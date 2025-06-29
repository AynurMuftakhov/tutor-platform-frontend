import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Container, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  useTheme, 
  ToggleButtonGroup, 
  ToggleButton,
  alpha,
  Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { pricingOptions } from '../../data/sample-data';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

// Currency conversion rates (approximate)
const CONVERSION_RATES = {
  USD: 1,
  EUR: 0.92
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€'
};

const PricingSnapshotSection: React.FC = () => {
  const theme = useTheme();
  const [currency, setCurrency] = useState<keyof typeof CONVERSION_RATES>('USD');

  // Load saved currency preference from localStorage on component mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && Object.keys(CONVERSION_RATES).includes(savedCurrency)) {
      setCurrency(savedCurrency as keyof typeof CONVERSION_RATES);
    }
  }, []);

  // Save currency preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preferredCurrency', currency);
  }, [currency]);

  // Handle currency change
  const handleCurrencyChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCurrency: keyof typeof CONVERSION_RATES | null,
  ) => {
    if (newCurrency !== null) {
      setCurrency(newCurrency);
    }
  };

  // Convert price to selected currency
  const convertPrice = (priceUSD: number): string => {
    const convertedPrice = priceUSD * CONVERSION_RATES[currency];

    // USD and EUR shown with 2 decimal places
    return `${CURRENCY_SYMBOLS[currency]}${convertedPrice.toFixed(0)}`;

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
        <Box sx={{ textAlign: 'center', mb: 8, position: 'relative' }}>
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
            sx={{ maxWidth: '700px', mx: 'auto', mb: 3 }}
          >
            Transparent pricing with no hidden fees
          </Typography>

          {/* Currency toggle */}
          <Box 
            sx={{ 
              position: { xs: 'relative', md: 'absolute' },
              top: { md: 0 },
              right: { md: 0 },
              display: 'flex',
              justifyContent: { xs: 'center', md: 'flex-end' },
              mb: { xs: 4, md: 0 }
            }}
          >
            <ToggleButtonGroup
              value={currency}
              exclusive
              onChange={handleCurrencyChange}
              aria-label="currency selection"
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(4px)',
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 2,
                  px: 2,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    }
                  }
                }
              }}
            >
              {Object.keys(CONVERSION_RATES).map((curr) => (
                <ToggleButton 
                  key={curr} 
                  value={curr}
                  aria-label={`Show prices in ${curr}`}
                >
                  {curr}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {pricingOptions.map((option, index) => (
            <Grid  size={{xs:12, md:6}} key={option.id}>
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
                        {convertPrice(option.price)}
                      </Typography>
                      <Typography variant="subtitle1" component="span" sx={{ ml: 1, color: theme.palette.text.secondary }}>
                        / {option.duration}
                      </Typography>
                    </Box>

                    {/* Savings banner for 1-on-1 lessons */}
                    {option.id === 'one-on-one' && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: alpha(theme.palette.secondary.light, 0.15),
                          borderRadius: 2,
                          p: 1.5,
                          mb: 3,
                          gap: 1,
                        }}
                      >
                        <LocalOfferIcon color="secondary" fontSize="small" />
                        <Typography variant="body2" fontWeight={500} color="secondary.dark">
                          Save 10% with bundles of 5 or more lessons
                        </Typography>
                      </Box>
                    )}

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
      </Container>
    </Box>
  );
};

export default PricingSnapshotSection;
