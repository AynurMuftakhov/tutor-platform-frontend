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
import { alpha } from "@mui/material/styles";
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
}) => {
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
          width: { xs: "100%", sm: 420, md: 480 },
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
        }),
      }}
    >
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
