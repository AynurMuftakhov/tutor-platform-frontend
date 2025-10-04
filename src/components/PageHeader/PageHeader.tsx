import React from "react";
import { Box, Stack, Typography, alpha } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

export interface PageHeaderProps {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    sx?: SxProps<Theme>;
    disableDivider?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    actions,
    children,
    sx,
    disableDivider = false,
}) => {
    if (!title && !subtitle && !actions && !children) {
        return null;
    }

    const hasBodyContent = Boolean(children);
    const additionalStyles = Array.isArray(sx) ? sx : sx ? [sx] : [];

    return (
        <Box
            component="section"
            sx={[
                (theme: Theme) => ({
                    width: "100%",
                    position: "relative",
                    zIndex: 1,
                    backgroundColor: alpha(theme.palette.background.paper, 0.92),
                    backdropFilter: "blur(6px)",
                    borderBottom: disableDivider
                        ? "none"
                        : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                    paddingTop: theme.spacing(2.5),
                    paddingBottom: theme.spacing(hasBodyContent ? 3 : 2.5),
                    paddingLeft: theme.spacing(2.5),
                    paddingRight: theme.spacing(2.5),
                    [theme.breakpoints.up("sm")]: {
                        paddingLeft: theme.spacing(3),
                        paddingRight: theme.spacing(3),
                    },
                    [theme.breakpoints.up("md")]: {
                        paddingTop: theme.spacing(3.5),
                        paddingBottom: theme.spacing(hasBodyContent ? 4 : 3.5),
                        paddingLeft: theme.spacing(4),
                        paddingRight: theme.spacing(4),
                    },
                }),
                ...additionalStyles,
            ]}
        >
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 2, md: 3 }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
            >
                {(title || subtitle) && (
                    <Box>
                        {typeof title === "string" ? (
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{ fontWeight: 700, mb: subtitle ? 0.5 : 0 }}
                            >
                                {title}
                            </Typography>
                        ) : (
                            title
                        )}

                        {typeof subtitle === "string" ? (
                            <Typography variant="body1" color="text.secondary">
                                {subtitle}
                            </Typography>
                        ) : (
                            subtitle
                        )}
                    </Box>
                )}

                {actions && (
                    <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
                        {actions}
                    </Box>
                )}
            </Stack>

            {children && (
                <Box mt={3} width="100%">
                    {children}
                </Box>
            )}
        </Box>
    );
};

PageHeader.displayName = "PageHeader";

export default PageHeader;
