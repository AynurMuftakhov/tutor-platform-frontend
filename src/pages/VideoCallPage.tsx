import React, {  useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '@livekit/components-styles';
import { useAuth } from '../context/AuthContext';
import '../styles/livekit-custom.css';
import { useRtc } from '../context/RtcContext';
import DailyCallLayout from "../components/videoCall/DailyCallLayout";

interface VideoCallPageProps {
    identity?: string;
    roomName?: string;
}

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [searchParams] = useSearchParams();

    const roomName = props.roomName ||
        searchParams.get('roomName') ||
        (location.state?.roomName as string);
    const studentId = searchParams.get('studentId') ||
        (location.state?.studentId as string);

    const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;
    const previousPath = location.state?.from || '/dashboard';

    const { refreshJoin } = useRtc();

    // Define leave handler and RTC hooks BEFORE any early returns to preserve Hooks order
    const handleLeave = () => navigate(previousPath);

    // Bootstrap RTC join once auth user and roomName are available
    useEffect(() => {
        if (!user?.id || !roomName) return;
        if (joinStartedRef.current) return;
        joinStartedRef.current = true;

        const mappedRole =
            user?.role === 'tutor' ? 'teacher'
                : user?.role === 'student' ? 'student'
                    : undefined;

        // Pass explicit hint so context doesn't depend solely on the URL query
        void refreshJoin({ roomName, lessonId, role: mappedRole });
    }, [user?.id, user?.role, roomName, lessonId, refreshJoin]);

    const joinStartedRef = useRef(false);

    /* ------------------------------------------------------------------ */
    /* 3. Normal render                                                   */
    /* ------------------------------------------------------------------ */

        return (
            <DailyCallLayout
                roomName={roomName ?? undefined}
                studentId={studentId ?? undefined}
                onLeave={handleLeave}
            />
        );
};

export default VideoCallPage;
