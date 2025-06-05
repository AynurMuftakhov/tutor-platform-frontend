import React from 'react';
import { Helmet } from 'react-helmet';
import { Box, useTheme } from '@mui/material';

// Import all section components
import Navigation from './Navigation';
import HeroSection from './HeroSection';
import WhySection from './WhySection';
import SneakPeekSection from './SneakPeekSection';
import TestimonialsSection from './TestimonialsSection';
import HowItWorksSection from './HowItWorksSection';
import BioSection from './BioSection';
import PricingSnapshotSection from './PricingSnapshotSection';
import FAQSection from './FAQSection';
import Footer from './Footer';

const LandingPage: React.FC = () => {
  const theme = useTheme();

  return (
    <>
      <Helmet>
        <title>Speakshire – English with Sabina</title>
        <meta name="description" content="A private, student-centred platform for confident, fluent English. Learn with Sabina on Speakshire." />
        <meta property="og:title" content="Speakshire – English with Sabina" />
        <meta property="og:description" content="A private, student-centred platform for confident, fluent English." />
        <meta property="og:image" content="/assets/hero.jpg" />
        <meta property="og:type" content="website" />
        <link rel="preload" href="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDXK1hY.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZs.woff" as="font" type="font/woff" crossOrigin="anonymous" />
      </Helmet>

      <Navigation />

      <Box 
        component="main"
        sx={{
          background: (theme.palette as any).gradients.lightRadial,
        }}
      >
        <HeroSection />
        <Box id="why-speakshire">
          <WhySection />
        </Box>
        <SneakPeekSection />
        <TestimonialsSection />
        <HowItWorksSection />
        <BioSection />
        <Box id="pricing">
          <PricingSnapshotSection />
        </Box>
        <Box id="faq">
          <FAQSection />
        </Box>
        <Footer />
      </Box>
    </>
  );
};

export default LandingPage;
