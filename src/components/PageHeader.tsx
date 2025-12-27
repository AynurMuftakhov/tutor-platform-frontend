import React, { ReactNode } from 'react';
import { Box, Divider, Stack, Typography, useTheme } from '@mui/material';
import { PAGE_HEADER } from '../constants/layout';

export interface PageHeaderProps {
    // Core
    title: string;
    subtitle?: string;
    icon?: ReactNode;

    // Styling variants
    titleColor?: 'default' | 'primary' | 'gradient';
    sticky?: boolean;
    glassmorphism?: boolean;

    // Actions
    actions?: ReactNode;

    // Secondary row
    secondaryRow?: ReactNode;

    // For pages that need metrics/KPIs inline with title
    metrics?: ReactNode;

    // Optional divider below header
    showDivider?: boolean;

    // Custom bottom margin
    mb?: number;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    titleColor = 'default',
    sticky = false,
    glassmorphism = false,
    actions,
    secondaryRow,
    metrics,
    showDivider = false,
    mb = PAGE_HEADER.HEADER_MB,
}) => {
    const theme = useTheme();

    // Compute title color styles
    const getTitleStyles = () => {
        switch (titleColor) {
            case 'primary':
                return { color: theme.palette.primary.main };
            case 'gradient':
                return {
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                };
            default:
                return { color: theme.palette.text.primary };
        }
    };

    // Container styles for sticky/glassmorphism
    const containerStyles = {
        ...(sticky && {
            position: 'sticky' as const,
            top: PAGE_HEADER.STICKY_TOP,
            zIndex: theme.zIndex.appBar,
        }),
        ...(glassmorphism && {
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark'
                ? 'rgba(30,33,40,0.6)'
                : 'rgba(255,255,255,0.75)',
            backdropFilter: 'saturate(140%) blur(10px)',
            border: '1px solid',
            borderColor: 'divider',
        }),
        mb,
    };

    return (
        <Box sx={containerStyles}>
            {/* Primary row: Title + Actions */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
            >
                {/* Title section */}
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {icon && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: titleColor === 'primary' ? 'primary.main' : 'text.primary',
                                    '& .MuiSvgIcon-root': {
                                        fontSize: 32,
                                    },
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1.3,
                                letterSpacing: '-0.01em',
                                ...getTitleStyles(),
                            }}
                        >
                            {title}
                        </Typography>
                    </Stack>
                    {subtitle && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: PAGE_HEADER.TITLE_MB }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {/* Actions and/or metrics */}
                {(actions || metrics) && (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        {metrics}
                        {actions}
                    </Stack>
                )}
            </Stack>

            {/* Secondary row */}
            {secondaryRow && (
                <Box sx={{ mt: PAGE_HEADER.SECONDARY_MT }}>
                    {secondaryRow}
                </Box>
            )}

            {/* Optional divider */}
            {showDivider && (
                <Divider sx={{ mt: 2 }} />
            )}
        </Box>
    );
};

export default PageHeader;

