import { useEffect, useState } from 'react';

export const useOnlineStatus = () => {
    const [online, setOnline] = useState<boolean>(() => {
        if (typeof navigator === 'undefined') {
            return true;
        }
        return navigator.onLine;
    });

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return online;
};

export default useOnlineStatus;
