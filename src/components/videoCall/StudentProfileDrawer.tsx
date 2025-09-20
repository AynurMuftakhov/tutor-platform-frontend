import React from "react";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import StudentPage from "../../pages/StudentPage";

interface StudentProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  studentId?: string;
  showShareToggle?: boolean;
  shareEnabled?: boolean;
  onShareChange?: (value: boolean) => void;
  activeTab?: number;
  onTabChange?: (tab: number) => void;
  sharedBy?: string;
  allowClose?: boolean;
  resizable?: boolean;
  initialWidth?: number;
}

const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  open,
  onClose,
  studentId,
  showShareToggle = false,
  shareEnabled = false,
  onShareChange,
  activeTab,
  onTabChange,
  sharedBy,
  allowClose = true,
  resizable = true,
  initialWidth = 840,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const minWidth = 360;
  const maxWidth = 720;
  const clamp = React.useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [maxWidth, minWidth],
  );
  const [width, setWidth] = React.useState(() => clamp(initialWidth));
  const [isResizing, setIsResizing] = React.useState(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(width);

  React.useEffect(() => {
    setWidth(clamp(initialWidth));
  }, [initialWidth, clamp]);

  React.useEffect(() => {
    if (!resizable || isMobile || !isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const delta = startXRef.current - event.clientX;
      const nextWidth = clamp(startWidthRef.current + delta);
      setWidth(nextWidth);
    };

    const stopResizing = () => {
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [clamp, resizable, isMobile, isResizing]);

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizable || isMobile) return;
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!resizable || isMobile) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 32 : -32;
    setWidth((prev) => clamp(prev + direction));
  };

  const handleShareToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onShareChange?.(event.target.checked);
  };

  const handleClose = () => {
    if (allowClose) {
      onClose();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: (theme) => ({
          width: { xs: "100%", sm: width },
          minWidth: { xs: "100%", sm: minWidth },
          maxWidth: { xs: "100%", sm: maxWidth },
          transition: isResizing ? "none" : "width 200ms ease",
          borderTopLeftRadius: { xs: 0, sm: 20 },
          borderBottomLeftRadius: { xs: 0, sm: 20 },
          bgcolor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.92)
              : alpha("#ffffff", 0.94),
          backdropFilter: "blur(24px)",
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.25)}`,
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.35)",
          display: "flex",
          flexDirection: "column",
          userSelect: isResizing ? "none" : undefined,
        }),
      }}
    >
      {!isMobile && resizable && (
        <Box
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            cursor: "ew-resize",
            display: { xs: "none", sm: "block" },
            zIndex: 2,
            touchAction: "none",
            "&::after": {
              content: '""',
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 2,
              height: "36%",
              borderRadius: 1,
              bgcolor: alpha(theme.palette.text.primary, 0.2),
            },
            "&:focus-visible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }}
        />
      )}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1, color: "primary.main" }}>
              Student insights
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Student profile
            </Typography>
            {sharedBy && (
              <Typography variant="caption" color="text.secondary">
                Shared by {sharedBy}
              </Typography>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            {showShareToggle && (
              <FormControlLabel
                control={<Switch size="small" checked={shareEnabled} onChange={handleShareToggle} />}
                label="Show to student"
                sx={{
                  ml: 0,
                  color: "text.secondary",
                  "& .MuiFormControlLabel-label": {
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  },
                }}
              />
            )}
            {shareEnabled && (
              <Chip size="small" color="success" label="Sharing" sx={{ fontWeight: 600 }} />
            )}
            {!showShareToggle && sharedBy && (
              <Chip size="small" color="primary" variant="outlined" label="Live" sx={{ fontWeight: 600 }} />
            )}
            {allowClose && (
              <IconButton onClick={handleClose} size="small" color="inherit">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 2.5 }, pb: 3 }}>
        {studentId ? (
          <StudentPage
            studentIdOverride={studentId}
            embedded
            hideOverviewTab
            activeTabOverride={activeTab}
            onTabChange={onTabChange}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary">No student selected.</Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default StudentProfileDrawer;
