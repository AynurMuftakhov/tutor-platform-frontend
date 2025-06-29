import React from 'react';
import { Box, Container, Grid, Typography, Link as MuiLink, IconButton, useTheme, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        backgroundColor: theme.palette.grey[900],
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{xs:12, md:4}}>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h4"
                component="div"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: 'white',
                  mb: 2,
                }}
              >
                Speakshire
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.grey[400], mb: 2 }}>
                A private, student-centred platform for confident, fluent English.
              </Typography>
            </Box>
          </Grid>

          <Grid size={{xs:12, md:4, sm:6}}>

          </Grid>

          <Grid  size={{xs:12, md:4, sm:6}}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                aria-label="Instagram"
                href="https://www.instagram.com/mew.sabina/"
                sx={{
                  color: theme.palette.grey[300],
                  '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                aria-label="LinkedIn"
                href="https://www.linkedin.com/in/sabina-shekhmametyeva-490604232/"
                sx={{
                  color: theme.palette.grey[300],
                  '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <LinkedInIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: theme.palette.grey[400] }}>
            &copy; {currentYear} Speakshire. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <MuiLink
              component={Link}
              to="/privacy"
              sx={{
                color: theme.palette.grey[400],
                textDecoration: 'none',
                '&:hover': { color: 'white', textDecoration: 'underline' },
              }}
            >
              Privacy Policy
            </MuiLink>
            <MuiLink
              component={Link}
              to="/terms"
              sx={{
                color: theme.palette.grey[400],
                textDecoration: 'none',
                '&:hover': { color: 'white', textDecoration: 'underline' },
              }}
            >
              Terms of Service
            </MuiLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
