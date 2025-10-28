const units: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2592000, divisor: 604800, unit: 'week' },
    { limit: 31536000, divisor: 2592000, unit: 'month' },
    { limit: Infinity, divisor: 31536000, unit: 'year' },
];

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();

const getFormatter = (locale: string) => {
    if (!rtfCache.has(locale)) {
        rtfCache.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
    }
    return rtfCache.get(locale)!;
};

export const formatRelativeTime = (ts?: string | number | Date, locale?: string): string => {
    if (!ts) return '—';
    const target = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : ts;
    if (Number.isNaN(target.getTime())) return '—';
    const now = Date.now();
    const diffSeconds = Math.round((target.getTime() - now) / 1000);

    const absSeconds = Math.abs(diffSeconds);
    for (const { limit, divisor, unit } of units) {
        if (absSeconds < limit) {
            const value = Math.round(diffSeconds / divisor);
            const formatter = getFormatter(locale || navigator.language || 'en');
            return formatter.format(value, unit);
        }
    }
    return target.toLocaleString();
};

export const formatDurationMinutes = (seconds?: number): string => {
    if (!seconds) return '0m';
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
};
