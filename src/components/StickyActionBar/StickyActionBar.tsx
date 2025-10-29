import * as React from 'react';
import { Box, BoxProps } from '@mui/material';

export type StickyActionBarProps = BoxProps;

const StickyActionBar = React.forwardRef<HTMLDivElement, StickyActionBarProps>(
  ({ sx, ...props }, ref) => (
    <Box
      ref={ref}
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.5,
        backgroundColor: (theme) => theme.palette.background.paper,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        padding: 'calc(var(--space-16, 16px) + env(safe-area-inset-bottom)) var(--space-16, 16px)',
        ...sx,
      }}
      {...props}
    />
  )
);

StickyActionBar.displayName = 'StickyActionBar';

export default StickyActionBar;
