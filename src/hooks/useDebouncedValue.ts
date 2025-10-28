import React from 'react';

export const useDebouncedValue = <T,>(value: T, delay: number): T => {
    const [debounced, setDebounced] = React.useState(value);

    React.useEffect(() => {
        const handle = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(handle);
    }, [value, delay]);

    return debounced;
};

export default useDebouncedValue;
