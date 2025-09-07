import React, { useRef, useState } from 'react';
import { useClassroomJoin } from './useClassroomJoin';
import { launchAgora } from './launchers/agoraLauncher';
import { launchLiveKit } from './launchers/livekitLauncher';
import { useAuth } from "../../context/AuthContext";
import { useFocusMode } from './focus/useFocusMode';
import './focus/focusMode.css';

interface Props {
  lessonId: string;
  role: 'teacher'|'student';
  roomName: string;
  userName: string;
}

const VideoClassLauncher: React.FC<Props> = ({ lessonId, role, roomName, userName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAgora, setIsAgora] = useState(false);
  const { mutateAsync, isPending } = useClassroomJoin();
  const { user } = useAuth();
  const { isFocus, enter, exit } = useFocusMode(containerRef);

  const handleJoin = async () => {
    setError(null);
    try {
      const res = await mutateAsync({ userId: user?.id, lessonId, role });
      const el = containerRef.current!;
      if (!el) throw new Error('Container not ready');

      if (res.provider === 'AGORA' && res.agora) {
        setIsAgora(true);
        await launchAgora(el, res.agora, roomName, userName, role);
      } else if (res.provider === 'LIVEKIT' && res.livekit) {
        setIsAgora(false);
        await launchLiveKit(el, res.livekit, userName);
      } else {
        throw new Error('Unknown provider response');
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.startsWith('TRY_LATER:')) {
        const secs = msg.split(':')[1];
        setError(`Server is busy. Try again in ~${secs}s.`);
      } else {
        setError('Unable to join classroom. Please retry.');
      }
    }
  };

  return (
    <div>
      <div
        ref={containerRef}
        style={{ width: '100%', height: isFocus ? '100vh' : '70vh', position: 'relative', background: '#000' }}
      >
        {/* Focus overlay buttons (only for Agora sessions) */}
        {isAgora && (
          <div className="agora-focus-overlay">
            {!isFocus ? (
              <button className="agora-focus-button" onClick={enter} title="Hide classroom UI and focus on 1:1 video">
                Focus 1:1
              </button>
            ) : (
              <button className="agora-focus-button" onClick={exit} title="Restore full classroom UI">
                Back to Classroom
              </button>
            )}
          </div>
        )}
      </div>
      <button onClick={handleJoin} disabled={isPending} style={{ marginTop: 8 }}>Join</button>
      {error && <div role="alert">{error}</div>}
    </div>
  );
};

export default VideoClassLauncher;
