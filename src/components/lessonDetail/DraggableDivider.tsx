import React, { useState, useEffect, useRef } from 'react';
import { Divider, Box } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';

interface DraggableDividerProps {
  onDrag: (newRatio: number) => void;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

/**
 * A draggable divider component that allows resizing the split between two panes
 * using CSS Grid columns
 */
const DraggableDivider: React.FC<DraggableDividerProps> = ({
  onDrag,
  minLeftWidth = 280, // Minimum width of left pane in pixels
  maxLeftWidth = 60,  // Maximum width of left pane as percentage
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const gridRectRef = useRef<{ left: number; width: number; top: number; height: number } | null>(null);

  const attachOverlay = () => {
    if (overlayRef.current) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    const rect = gridRectRef.current;
    if (rect) {
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    } else {
      overlay.style.inset = '0';
    }
    overlay.style.zIndex = '2147483647';
    overlay.style.cursor = 'col-resize';
    overlay.style.background = 'transparent';
    overlay.style.touchAction = 'none';
    document.body.appendChild(overlay);
    overlayRef.current = overlay;
  };

  const removeOverlay = () => {
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
  };

  const captureGridRect = () => {
    const grid = document.querySelector('[data-workspace-grid="true"]') as HTMLElement | null;
    if (grid) {
      const rect = grid.getBoundingClientRect();
      gridRectRef.current = { left: rect.left, width: rect.width, top: rect.top, height: rect.height };
    } else {
      gridRectRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    captureGridRect();
    attachOverlay();
    setIsDragging(true);
  };

  // Handle touch start to start dragging on touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    captureGridRect();
    attachOverlay();
    setIsDragging(true);
  };

  // Handle mouse/touch move to calculate new ratio
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gridRectRef.current;
      const containerWidth = rect?.width ?? window.innerWidth;
      const startX = rect?.left ?? 0;
      let newLeftWidth = e.clientX - startX;
      if (newLeftWidth < 0) newLeftWidth = 0;
      if (newLeftWidth > containerWidth) newLeftWidth = containerWidth;

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

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = gridRectRef.current;
        const containerWidth = rect?.width ?? window.innerWidth;
        const startX = rect?.left ?? 0;
        let newLeftWidth = e.touches[0].clientX - startX;
        if (newLeftWidth < 0) newLeftWidth = 0;
        if (newLeftWidth > containerWidth) newLeftWidth = containerWidth;

        // Calculate percentage (0-100)
        let newRatio = (newLeftWidth / containerWidth) * 100;

        // Enforce min width in pixels
        const minRatio = (minLeftWidth / containerWidth) * 100;
        if (newRatio < minRatio) newRatio = minRatio;

        // Enforce max width as percentage
        if (newRatio > maxLeftWidth) newRatio = maxLeftWidth;

        onDrag(newRatio);
      }
    };

    // Handle mouse/touch up to stop dragging
    const handleMouseUp = () => {
      setIsDragging(false);
      removeOverlay();
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      removeOverlay();
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      removeOverlay();
    };
  }, [isDragging, onDrag, minLeftWidth, maxLeftWidth]);

  useEffect(() => {
    return () => {
      removeOverlay();
    };
  }, []);

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
      onTouchStart={handleTouchStart}
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
