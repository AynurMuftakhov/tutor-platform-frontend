import React from 'react';
import { Helmet } from 'react-helmet';
import { Box } from '@mui/material';

// Import all section components
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
   return (
    <>
      <Helmet>
        <title>Speakshire – English with Sabina</title>
        <meta name="description" content="A private, student-centred platform for confident, fluent English. Learn with Sabina on Speakshire." />
        <meta property="og:title" content="Speakshire – English with Sabina" />
        <meta property="og:description" content="A private, student-centred platform for confident, fluent English." />
        <meta property="og:image" content="/assets/hero.jpg" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Box component="main">
        <HeroSection />
        <WhySection />
        <SneakPeekSection />
        <TestimonialsSection />
        <HowItWorksSection />
        <BioSection />
        <PricingSnapshotSection />
        <FAQSection />
        <Footer />
      </Box>
    </>
  );
};

export default LandingPage;