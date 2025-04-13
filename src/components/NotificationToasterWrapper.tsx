import React, { useEffect, useState } from 'react';
import NotificationToaster from './NotificationToaster';
import {NotificationMessage, useNotificationSocket} from "../context/NotificationsSocketContext";

const NotificationToasterWrapper = () => {
    const { notifications } = useNotificationSocket();
    const [current, setCurrent] = useState<NotificationMessage | null>(null);

    useEffect(() => {
        const unread = notifications.find(n => !n.isRead);
        if (unread) {
            setCurrent(unread);
        }
    }, [notifications]);

    const handleClose = () => setCurrent(null);

    return <NotificationToaster notification={current} onClose={handleClose} />;
};

export default NotificationToasterWrapper;