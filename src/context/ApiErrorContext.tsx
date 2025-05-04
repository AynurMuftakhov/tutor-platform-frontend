import React, { createContext, useContext, useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { setApiErrorHandler } from '../services/api';

// Define the structure of an API error
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

// Context value interface
interface ApiErrorContextValue {
  showError: (error: ApiError) => void;
  clearError: () => void;
}

// Create the context with default values
const ApiErrorContext = createContext<ApiErrorContextValue>({
  showError: () => {},
  clearError: () => {},
});

// Custom hook to use the API error context
export const useApiError = () => useContext(ApiErrorContext);

// Provider component
export const ApiErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<ApiError | null>(null);
  const [open, setOpen] = useState(false);

  const showError = (apiError: ApiError) => {
    setError(apiError);
    setOpen(true);
  };

  const clearError = () => {
    setOpen(false);
    // We'll clear the error after the snackbar closes to prevent UI flicker
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setError(null), 300); // Clear error after animation completes
  };

  // Set up the global error handler when the component mounts
  useEffect(() => {
    // Set the error handler to our showError function
    setApiErrorHandler(showError);

    // Clean up when the component unmounts
    return () => {
      // Reset the error handler to null
      setApiErrorHandler(() => {});
    };
  }, []);

  return (
    <ApiErrorContext.Provider value={{ showError, clearError }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {error ? (
          <Alert
            onClose={handleClose}
            severity="error"
            sx={{
              width: '100%',
              borderRadius: 2,
              boxShadow: 3,
              px: 2,
              py: 1,
              fontSize: '0.9rem',
            }}
          >
            {error.message || 'An error occurred'}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ApiErrorContext.Provider>
  );
};
