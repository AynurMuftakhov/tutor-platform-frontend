import { useState, useEffect, useCallback } from 'react';

// Default split ratio (38% for the left pane)
const DEFAULT_SPLIT_RATIO = 38;
// Default workspace open state (false)
const DEFAULT_WORKSPACE_OPEN = false;

/**
 * Hook to manage workspace toggle state and split ratio
 * @returns {[boolean, () => void, () => void, number, (ratio: number) => void]} 
 * Array containing: [isOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio]
 */
export const useWorkspaceToggle = () => {
  // State for workspace open/closed
  const [open, setOpen] = useState(() => {
    // Try to get saved open state from localStorage
    const savedOpen = localStorage.getItem('workspaceOpen');
    return savedOpen ? JSON.parse(savedOpen) : DEFAULT_WORKSPACE_OPEN;
  });

  // State for split ratio (percentage width of left pane)
  const [splitRatio, setSplitRatio] = useState(() => {
    // Try to get saved ratio from localStorage
    const savedRatio = localStorage.getItem('splitRatio');
    return savedRatio ? Number(savedRatio) : DEFAULT_SPLIT_RATIO;
  });

  // Save split ratio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('splitRatio', splitRatio.toString());
  }, [splitRatio]);

  // Save open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('workspaceOpen', JSON.stringify(open));
  }, [open]);

  // Function to open workspace
  const openWorkspace = useCallback(() => {
    setOpen(true);
  }, []);

  // Function to close workspace
  const closeWorkspace = useCallback(() => {
    setOpen(false);
  }, []);

  // Add escape key handler to close workspace
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        closeWorkspace();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [open, closeWorkspace]);

  return [open, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] as const;
};
