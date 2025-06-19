import React from 'react';
import { Box, useTheme } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import StarOutlineIcon from '@mui/icons-material/StarOutline';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  precision?: 0.5 | 1;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'small',
  color,
  precision = 0.5
}) => {
  const theme = useTheme();
  const starColor = color || theme.palette.primary.main;
  
  // Calculate size in pixels
  const sizeInPx = {
    small: 16,
    medium: 20,
    large: 24
  }[size];
  
  // Generate stars array
  const stars = [];
  const roundedRating = Math.round(rating * (1 / precision)) / (1 / precision);
  
  for (let i = 1; i <= maxRating; i++) {
    if (i <= roundedRating) {
      // Full star
      stars.push(
        <StarIcon 
          key={i} 
          sx={{ 
            color: starColor,
            width: sizeInPx,
            height: sizeInPx
          }} 
        />
      );
    } else if (i - 0.5 === roundedRating && precision === 0.5) {
      // Half star
      stars.push(
        <StarHalfIcon 
          key={i} 
          sx={{ 
            color: starColor,
            width: sizeInPx,
            height: sizeInPx
          }} 
        />
      );
    } else {
      // Empty star
      stars.push(
        <StarOutlineIcon 
          key={i} 
          sx={{ 
            color: starColor,
            width: sizeInPx,
            height: sizeInPx
          }} 
        />
      );
    }
  }
  
  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}
      aria-label={`Rating: ${rating} out of ${maxRating} stars`}
    >
      {stars}
    </Box>
  );
};

export default StarRating;