import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AlertColor } from "@mui/material";
import {fetchNotifications} from "../services/api";

export interface NotificationMessage {
    id: string;
    title: string;
    body: string;
    severity: AlertColor; // 'success' | 'info' | 'warning' | 'error'
    type: string;
    targetId: string;
    isRead: boolean;
}

interface NotificationSocketContextValue {
    socket: WebSocket | null;
    notifications: NotificationMessage[];
    setNotifications: React.Dispatch<React.SetStateAction<NotificationMessage[]>>;
    isPanelOpen: boolean;
    togglePanel: () => void;
}

const NotificationSocketContext = createContext<NotificationSocketContextValue>({
    socket: null,
    notifications: [],
    setNotifications: () => {},
    isPanelOpen: false,
    togglePanel: () => {},
});

export const useNotificationSocket = () => useContext(NotificationSocketContext);

interface Props {
    userId: string;
    children: React.ReactNode;
}

export const NotificationSocketProvider: React.FC<Props> = ({ userId, children }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const togglePanel = () => setIsPanelOpen((prev) => !prev);

    useEffect(() => {
        if (socketRef.current) return;
        if (!userId) return;

        const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/notifications?userId=${userId}`);
        socketRef.current = ws;

        ws.onopen = () => console.log("WebSocket connected");
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const newNotif: NotificationMessage = {
                    ...data,
                    id: data.id
                };

                setNotifications(prev => {
                    const exists = prev.some(n => n.id === newNotif.id);
                    if (exists) return prev;
                    return [newNotif, ...prev];
                });
            } catch (err) {
                console.error("Failed to parse message", err);
            }
        };

        ws.onerror = (err) => console.error("WebSocket error", err);

        ws.onclose = () => {
            console.log("WebSocket closed");
            setTimeout(() => {
                socketRef.current = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/notifications?userId=${userId}`);
            }, 3000);
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            socketRef.current = null;
        };
    }, [userId]);

    useEffect(() => {
        const loadNotifications = async () => {
            if (userId) {
                try {
                    const data = await fetchNotifications(userId);
                    setNotifications(data);
                } catch (e) {
                    console.error("Failed to fetch notifications:", e);
                }
            }
        };

        loadNotifications();
    }, [userId]);

    return (
        <NotificationSocketContext.Provider value={{ socket: socketRef.current, notifications, setNotifications, isPanelOpen, togglePanel }}>
            {children}
        </NotificationSocketContext.Provider>
    );
};
