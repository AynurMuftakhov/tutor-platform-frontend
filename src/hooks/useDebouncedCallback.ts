import { useCallback, useEffect, useRef } from 'react';

type AnyFunction = (...args: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

type DebouncedResult<T extends AnyFunction> = {
    callback: T;
    cancel: () => void;
    flush: () => void;
};

export const useDebouncedCallback = <T extends AnyFunction>(callback: T, delay: number): DebouncedResult<T> => {
    const timeoutRef = useRef<number | undefined>(undefined);
    const latestCallbackRef = useRef<T>(callback);
    const lastArgsRef = useRef<Parameters<T> | undefined>(undefined);

    useEffect(() => {
        latestCallbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== undefined) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const cancel = useCallback(() => {
        if (timeoutRef.current !== undefined) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
        lastArgsRef.current = undefined;
    }, []);

    const flush = useCallback(() => {
        if (timeoutRef.current === undefined) {
            return;
        }
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
        if (lastArgsRef.current) {
            latestCallbackRef.current(...lastArgsRef.current);
            lastArgsRef.current = undefined;
        }
    }, []);

    const debounced = useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current !== undefined) {
            window.clearTimeout(timeoutRef.current);
        }

        lastArgsRef.current = args;
        timeoutRef.current = window.setTimeout(() => {
            timeoutRef.current = undefined;
            const pendingArgs = lastArgsRef.current;
            lastArgsRef.current = undefined;
            if (pendingArgs) {
                latestCallbackRef.current(...pendingArgs);
            }
        }, delay);
    }, [delay]) as T;

    return {
        callback: debounced,
        cancel,
        flush
    };
};

export default useDebouncedCallback;
