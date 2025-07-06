import React, { useState, useEffect } from 'react';
import { Divider, Box } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';

interface DraggableDividerProps {
  onDrag: (newRatio: number) => void;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

/**
 * A draggable divider component that allows resizing the split between two panes
 */
const DraggableDivider: React.FC<DraggableDividerProps> = ({
  onDrag,
  minLeftWidth = 280, // Minimum width of left pane in pixels
  maxLeftWidth = 70,  // Maximum width of left pane as percentage
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle mouse move to calculate new ratio
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const newLeftWidth = e.clientX;
      
      // Calculate percentage (0-100)
      let newRatio = (newLeftWidth / containerWidth) * 100;
      
      // Enforce min width in pixels
      const minRatio = (minLeftWidth / containerWidth) * 100;
      if (newRatio < minRatio) newRatio = minRatio;
      
      // Enforce max width as percentage
      if (newRatio > maxLeftWidth) newRatio = maxLeftWidth;
      
      // Call the onDrag callback with the new ratio
      onDrag(newRatio);
    };

    // Handle mouse up to stop dragging
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag, minLeftWidth, maxLeftWidth]);

  return (
    <Divider
      orientation="vertical"
      flexItem
      sx={{
        cursor: 'col-resize',
        width: '6px',
        backgroundColor: isDragging ? 'primary.main' : 'divider',
        '&:hover': {
          backgroundColor: 'primary.light',
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '32px',
          width: '16px',
          borderRadius: '4px',
          backgroundColor: isDragging ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: 'primary.light',
          },
        }}
      >
        <DragHandleIcon
          sx={{
            color: isDragging ? 'white' : 'text.secondary',
            transform: 'rotate(90deg)',
            fontSize: '16px',
          }}
        />
      </Box>
    </Divider>
  );
};

export default DraggableDivider;