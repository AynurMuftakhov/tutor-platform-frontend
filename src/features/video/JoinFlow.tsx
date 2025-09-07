import React, { useState } from 'react';
import PreJoinPanel from './prejoin/PreJoinPanel';
import VideoClassLauncher from './VideoClassLauncher';

interface Props {
  lessonId: string;
  role: 'teacher'|'student';
  roomName: string;
  userName: string;
}

const JoinFlow: React.FC<Props> = (props) => {
  const [confirmed, setConfirmed] = useState(false);
  // Keep selected devices for potential future use (not wired to launchers yet)
  const [devices, setDevices] = useState<{cameraId?: string; micId?: string; speakerId?: string}>({});

  if (!confirmed) {
    return (
      <PreJoinPanel
        {...props}
        onContinue={(d) => { setDevices(d); setConfirmed(true); }}
        onCancel={() => history.back()}
      />
    );
  }

  return <VideoClassLauncher {...props} />;
};

export default JoinFlow;
