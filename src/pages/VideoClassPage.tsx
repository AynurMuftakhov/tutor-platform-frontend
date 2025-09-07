import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import JoinFlow from '../features/video/JoinFlow';

const VideoClassPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const roomName = (searchParams.get('roomName') || (location.state?.roomName as string) || '').toString();
  const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;

  const role: 'teacher'|'student' = user?.role === 'tutor' ? 'teacher' : 'student';
  const userName = user?.name || 'User';

  return (
    <div style={{ padding: 16 }}>
      <JoinFlow
        lessonId={lessonId}
        role={role}
        roomName={roomName || `lesson-${lessonId}`}
        userName={userName}
      />
    </div>
  );
};

export default VideoClassPage;
