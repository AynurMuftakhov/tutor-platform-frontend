import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface VideoCallButtonProps {
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

const VideoCallButton: React.FC<VideoCallButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRoomName('');
    setError('');
  };

  const handleJoin = () => {
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    if (!user) {
      setError('You must be logged in to join a video call');
      return;
    }

    // Navigate to the video call page with the required parameters
    navigate('/video-call', {
      state: {
        identity: user.id,
        roomName: roomName.trim(),
        from: location.pathname, // Store current path to return after call
      },
    });

    handleClose();
  };

  return (
    <>
      <Button
        variant={variant}
        color={color}
        size={size}
        fullWidth={fullWidth}
        onClick={handleOpen}
      >
        Join Video Call
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Join Video Call</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="roomName"
            label="Room Name"
            type="text"
            fullWidth
            variant="outlined"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            error={!!error}
            helperText={error}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleJoin} variant="contained" color="primary">
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoCallButton;
