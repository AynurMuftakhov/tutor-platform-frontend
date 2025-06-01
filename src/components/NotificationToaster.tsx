import React from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { NotificationMessage } from "../context/NotificationsSocketContext";

interface NotificationToasterProps {
  notification: NotificationMessage | null;
  onClose: () => void;
}

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="down" />;
};

const NotificationToaster: React.FC<NotificationToasterProps> = ({ notification, onClose }) => {
  return (
    <Snackbar
      open={!!notification}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={SlideTransition}
    >
      {notification ? (
        <Alert
          onClose={onClose}
          severity={notification.severity}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: 3,
            px: 2,
            py: 1,
            fontSize: '0.9rem',
          }}
        >
          {notification.body}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};

export default NotificationToaster;