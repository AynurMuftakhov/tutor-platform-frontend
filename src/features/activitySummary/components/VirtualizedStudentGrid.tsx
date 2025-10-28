import React from 'react';
import { Box } from '@mui/material';

const CARD_HEIGHT = 232;
const ROW_GAP = 16;
const COLUMN_GAP = 16;
const MIN_COLUMN_WIDTH = 280;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface VirtualizedStudentGridProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    threshold?: number;
    overscanRows?: number;
}

export const VirtualizedStudentGrid = <T,>({
    items,
    renderItem,
    threshold = 100,
    overscanRows = 2,
}: VirtualizedStudentGridProps<T>) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [columns, setColumns] = React.useState(1);
    const [containerTop, setContainerTop] = React.useState(0);
    const [viewportHeight, setViewportHeight] = React.useState(typeof window !== 'undefined' ? window.innerHeight : 0);
    const [scrollTop, setScrollTop] = React.useState(typeof window !== 'undefined' ? window.scrollY : 0);

    const shouldVirtualize = items.length > threshold;

    React.useLayoutEffect(() => {
        const updateLayout = () => {
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const nextColumns = Math.max(1, Math.floor((width + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP)));
            setColumns(nextColumns);
            setContainerTop(rect.top + window.scrollY);
            setViewportHeight(window.innerHeight);
        };

        updateLayout();
        const resizeObserver = new ResizeObserver(updateLayout);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        window.addEventListener('resize', updateLayout);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateLayout);
        };
    }, []);

    React.useEffect(() => {
        if (!shouldVirtualize) return;
        const onScroll = () => setScrollTop(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [shouldVirtualize]);

    const rowHeight = CARD_HEIGHT + ROW_GAP;
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = totalRows * rowHeight;
    const relativeScrollTop = clamp(scrollTop - containerTop, 0, Math.max(0, totalHeight));
    const startRow = clamp(Math.floor(relativeScrollTop / rowHeight) - overscanRows, 0, Math.max(0, totalRows - 1));
    const endRow = clamp(
        Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + overscanRows,
        0,
        Math.max(0, totalRows - 1)
    );

    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, (endRow + 1) * columns);
    const visibleItems = shouldVirtualize ? items.slice(startIndex, endIndex) : items;

    const topSpacer = shouldVirtualize ? startRow * rowHeight : 0;
    const bottomSpacer = shouldVirtualize ? Math.max(0, totalHeight - (endRow + 1) * rowHeight) : 0;

    return (
        <Box ref={containerRef}>
            {shouldVirtualize && <Box sx={{ height: topSpacer }} />}
            <Box
                sx={{
                    display: 'grid',
                    gap: `${ROW_GAP}px`,
                    gridTemplateColumns: `repeat(auto-fit, minmax(${MIN_COLUMN_WIDTH}px, 1fr))`,
                    alignItems: 'stretch',
                }}
            >
                {visibleItems.map((item, index) => (
                    <Box key={(item as any)?.id ?? index} sx={{ height: CARD_HEIGHT }}>
                        {renderItem(item)}
                    </Box>
                ))}
            </Box>
            {shouldVirtualize && <Box sx={{ height: bottomSpacer }} />}
        </Box>
    );
};

export default VirtualizedStudentGrid;
