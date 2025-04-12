import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {AlertColor} from "@mui/material";

export interface NotificationMessage {
    title: string;
    subtitle: string;
    severity: AlertColor // 'success' | 'info' | 'warning' | 'error'
}

interface NotificationSocketContextValue {
    socket: WebSocket | null;
    notifications: NotificationMessage[];
}

const NotificationSocketContext = createContext<NotificationSocketContextValue>({
    socket: null,
    notifications: []
});

export const useNotificationSocket = () => useContext(NotificationSocketContext);

interface Props {
    userId: string;
    children: React.ReactNode;
}

export const NotificationSocketProvider: React.FC<Props> = ({ userId, children }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

    useEffect(() => {
        if (socketRef.current) return;
        if (!userId) return;

        const ws = new WebSocket(`ws://localhost/ws/notifications?userId=${userId}`);
        socketRef.current = ws;

        ws.onopen = () => console.log("WebSocket connected");
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setNotifications((prev) => [
                    {
                        title: data.title || "Notification",
                        subtitle: data.body || "",
                        severity: data.severity || "info"
                    },
                    ...prev
                ]);
            } catch (err) {
                console.error("Failed to parse message", err);
            }
        };

        ws.onerror = (err) => console.error("WebSocket error", err);
        ws.onclose = () => console.log("WebSocket closed");

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            socketRef.current = null;
        };
    }, [userId]);

    return (
        <NotificationSocketContext.Provider value={{ socket: socketRef.current, notifications }}>
            {children}
        </NotificationSocketContext.Provider>
    );
};
