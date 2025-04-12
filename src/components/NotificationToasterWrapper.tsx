import React, { useEffect, useState } from 'react';
import NotificationToaster from './NotificationToaster';
import {NotificationMessage, useNotificationSocket} from "../context/NotificationsSocketContext";

const NotificationToasterWrapper = () => {
    const { notifications } = useNotificationSocket();
    const [current, setCurrent] = useState<NotificationMessage | null>(null);

    useEffect(() => {
        if (notifications.length > 0) {
            setCurrent(notifications[0]);
        }
    }, [notifications]);

    const handleClose = () => setCurrent(null);

    return <NotificationToaster notification={current} onClose={handleClose} />;
};

export default NotificationToasterWrapper;