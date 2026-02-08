import React from "react";
import {
  Box,
  Chip,
  Paper,
  PaperProps,
  SxProps,
  Theme,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

const widgetCardShadow = "0 6px 18px rgba(15, 23, 42, 0.05)";
const widgetHoverShadow = "0 8px 20px rgba(15, 23, 42, 0.08)";

export const widgetPrimaryButtonSx: SxProps<Theme> = {
  borderRadius: 2,
  minHeight: 32,
  textTransform: "none",
  fontWeight: 600,
};

export const widgetSecondaryButtonSx: SxProps<Theme> = {
  ...widgetPrimaryButtonSx,
  borderColor: "divider",
  color: "text.primary",
};

type WidgetHeaderProps = {
  title: React.ReactNode;
  icon?: React.ReactNode;
  actionSlot?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({ title, icon, actionSlot, sx }) => (
  <Box
    sx={[
      {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        mb: 1.5,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      {icon && <Box sx={{ display: "inline-flex", color: "primary.main" }}>{icon}</Box>}
      <Typography variant="h6" fontWeight={700} noWrap>
        {title}
      </Typography>
    </Box>
    {actionSlot}
  </Box>
);

type DashboardWidgetCardProps = Omit<PaperProps, "title"> & {
  title: React.ReactNode;
  icon?: React.ReactNode;
  actionSlot?: React.ReactNode;
  headerSx?: SxProps<Theme>;
};

export const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  title,
  icon,
  actionSlot,
  headerSx,
  children,
  sx,
  ...paperProps
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={[
        {
          borderRadius: 2.5,
          p: 2.25,
          border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
          boxShadow: widgetCardShadow,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...paperProps}
    >
      <WidgetHeader title={title} icon={icon} actionSlot={actionSlot} sx={headerSx} />
      {children}
    </Paper>
  );
};

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "text.secondary", flexWrap: "wrap" }}>
    {icon && <Box sx={{ display: "inline-flex", color: "text.secondary" }}>{icon}</Box>}
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="body2">{title}</Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);

export type WidgetStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "CANCELED" | string;

const normalizeStatus = (status?: WidgetStatus): string => (status || "").toUpperCase();

const statusLabel = (status?: WidgetStatus): string => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "Unknown";
  if (normalized === "IN_PROGRESS") return "In progress";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Cancelled";
  return normalized.charAt(0) + normalized.slice(1).toLowerCase().replace(/_/g, " ");
};

const statusPaletteColor = (theme: Theme, status?: WidgetStatus) => {
  const normalized = normalizeStatus(status);
  if (normalized === "SCHEDULED" || normalized === "RESCHEDULED") return theme.palette.info.main;
  if (normalized === "IN_PROGRESS") return theme.palette.warning.main;
  if (normalized === "COMPLETED") return theme.palette.success.main;
  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "MISSED") {
    return theme.palette.error.main;
  }
  return theme.palette.text.secondary;
};

type StatusPillProps = {
  status?: WidgetStatus;
};

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const theme = useTheme();
  const color = statusPaletteColor(theme, status);

  return (
    <Chip
      size="small"
      label={statusLabel(status)}
      sx={{
        height: 24,
        borderRadius: 999,
        border: `1px solid ${alpha(color, 0.28)}`,
        bgcolor: alpha(color, 0.12),
        color,
        fontWeight: 600,
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  );
};

type WidgetListItemProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  startSlot?: React.ReactNode;
  endSlot?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export const WidgetListItem: React.FC<WidgetListItemProps> = ({
  title,
  subtitle,
  startSlot,
  endSlot,
  onClick,
  children,
  sx,
}) => {
  const theme = useTheme();
  const interactive = Boolean(onClick);

  return (
    <Box
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive || !onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      sx={[
        {
          border: `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
          borderRadius: 2,
          px: 1.5,
          py: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.96),
          transition: "all 0.18s ease",
          cursor: interactive ? "pointer" : "default",
          "&:hover": interactive
            ? {
                borderColor: alpha(theme.palette.primary.main, 0.25),
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                boxShadow: widgetHoverShadow,
              }
            : undefined,
          "&:focus-visible": interactive
            ? {
                outline: "none",
                borderColor: alpha(theme.palette.primary.main, 0.38),
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
              }
            : undefined,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        {startSlot && <Box sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary" }}>{startSlot}</Box>}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {typeof title === "string" ? (
            <Typography variant="body2" fontWeight={600} noWrap>
              {title}
            </Typography>
          ) : (
            title
          )}
          {subtitle &&
            (typeof subtitle === "string" ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : (
              subtitle
            ))}
        </Box>
        {endSlot && <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>{endSlot}</Box>}
      </Box>
      {children && <Box sx={{ mt: 1 }}>{children}</Box>}
    </Box>
  );
};
