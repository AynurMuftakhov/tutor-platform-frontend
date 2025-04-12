import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { NotificationMessage } from "../context/NotificationsSocketContext";

interface NotificationToasterProps {
  notification: NotificationMessage | null;
  onClose: () => void;
}

const NotificationToaster: React.FC<NotificationToasterProps> = ({ notification, onClose }) => {
  return (
    <Snackbar
      open={!!notification}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {notification ? (
        <Alert onClose={onClose} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.title}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};

export default NotificationToaster;