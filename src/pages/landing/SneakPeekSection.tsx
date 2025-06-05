import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, useTheme, Dialog, IconButton, useMediaQuery, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
// Import Swiper and modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const screenshots = [
  {
    id: 'dashboard',
    type: 'video',
    src: '/assets/screens/dashboard.mp4',
    poster: '/assets/screens/dashboard-poster.jpg',
    alt: 'Student Dashboard',
    caption: 'Student Dashboard - Track your progress and upcoming lessons'
  },
  {
    id: 'lessons-schedule',
    type: 'gif',
    src: '/assets/screens/lessons-schedule.jpg',
    alt: 'Lesson Calendar',
    caption: 'Interactive Calendar - Schedule and manage your lessons'
  }
];

const SneakPeekSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const swiperRef = useRef<any>(null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleOpenLightbox = (src: string) => {
    setSelectedImage(src);
  };

  const handleCloseLightbox = () => {
    setSelectedImage(null);
  };

  const handleSlideChange = (swiper: any) => {
    setActiveIndex(swiper.activeIndex);
  };

  // Media component that handles different content types
  const MediaContent = ({ item }: { item: typeof screenshots[0] }) => {
    switch (item.type) {
      case 'video':
        return (
          <Box
            component="video"
            src={item.src}
            poster={item.poster}
            autoPlay
            muted
            loop
            playsInline
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 3,
              boxShadow: theme.shadows[3],
            }}
          />
        );
      case 'gif':
        return (
          <Box
            component="img"
            src={item.src}
            alt={item.alt}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 3,
              boxShadow: theme.shadows[3],
            }}
          />
        );
      default:
        return (
          <Box
            component="img"
            src={item.src}
            alt={item.alt}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 3,
              boxShadow: theme.shadows[3],
            }}
            loading="lazy"
          />
        );
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
            Platform Sneak Peek
          </Typography>
          <Typography
            variant="h6"
            color="textSecondary"
            sx={{ maxWidth: '700px', mx: 'auto', mb: 2 }}
          >
            Get a glimpse of the intuitive interface that makes learning English enjoyable
          </Typography>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <Box
            sx={{
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: theme.shadows[4],
            }}
          >
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              modules={[Navigation, Pagination, A11y, EffectFade]}
              spaceBetween={0}
              slidesPerView={1}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              pagination={{ 
                clickable: true,
                el: '.swiper-pagination'
              }}
              effect={prefersReducedMotion ? 'slide' : 'fade'}
              onSlideChange={handleSlideChange}
              style={{ borderRadius: '16px' }}
            >
              {screenshots.map((item) => (
                <SwiperSlide key={item.id}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      cursor: item.type === 'image' ? 'pointer' : 'default',
                    }}
                    onClick={() => item.type === 'image' && handleOpenLightbox(item.src)}
                  >
                    <MediaContent item={item} />

                    {/* Caption with pill chip and backdrop blur */}
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 16,
                            left: 16,
                            maxWidth: '80%',
                            backgroundColor: alpha(theme.palette.common.black, 0.6),
                            backdropFilter: 'blur(8px)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '24px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                        >
                          <Typography variant="body2">{item.caption}</Typography>
                        </Box>
                      </motion.div>
                    </AnimatePresence>
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom navigation buttons */}
            <IconButton
              className="swiper-button-prev"
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: alpha(theme.palette.common.white, 0.8),
                backdropFilter: 'blur(4px)',
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.9),
                },
                opacity: isHovering ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>

            <IconButton
              className="swiper-button-next"
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: alpha(theme.palette.common.white, 0.8),
                backdropFilter: 'blur(4px)',
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.9),
                },
                opacity: isHovering ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <NavigateNextIcon />
            </IconButton>

            {/* Custom pagination */}
            <Box
              className="swiper-pagination"
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                display: 'flex',
                gap: 1,
                zIndex: 10,
              }}
            />
          </Box>
        </motion.div>

        <Dialog
          open={!!selectedImage}
          onClose={handleCloseLightbox}
          maxWidth="lg"
          fullWidth
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
              onClick={handleCloseLightbox}
            >
              <CloseIcon />
            </IconButton>
            {selectedImage && (
              <Box
                component="img"
                src={selectedImage}
                alt="Screenshot"
                sx={{
                  width: '100%',
                  height: 'auto',
                }}
              />
            )}
          </Box>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SneakPeekSection;
