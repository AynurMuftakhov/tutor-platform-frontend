import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, defaultValue: T) {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return defaultValue;
        }

        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue !== null) {
                return JSON.parse(storedValue) as T;
            }
        } catch (error) {
            console.warn(`Failed to parse localStorage value for ${key}`, error);
        }

        return defaultValue;
    });

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Failed to store localStorage value for ${key}`, error);
        }
    }, [key, value]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue === null) {
                setValue(defaultValue);
            }
        } catch (error) {
            console.warn(`Failed to read localStorage value for ${key}`, error);
        }
    }, [defaultValue, key]);

    return [value, setValue] as const;
}
