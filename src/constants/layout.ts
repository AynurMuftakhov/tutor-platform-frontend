/**
 * Layout constants for consistent spacing and sizing across the application.
 */

export const PAGE_HEADER = {
    /** Margin below title when subtitle exists */
    TITLE_MB: 0.5,
    /** Default margin below entire header */
    HEADER_MB: 3,
    /** Margin top for secondary row */
    SECONDARY_MT: 2,
    /** Top offset when sticky positioning is enabled */
    STICKY_TOP: 16,
    /** Minimum header height */
    MIN_HEIGHT: 48,
} as const;

export const PAGE_CONTAINER = {
    /** Default page padding */
    PADDING: { xs: 2, sm: 3 },
    /** Background color for pages */
    BG_COLOR: '#fafbfd',
} as const;

