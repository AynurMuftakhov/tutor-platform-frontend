import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { ENGLISH_LEVELS, EnglishLevel } from "../types/ENGLISH_LEVELS";
import { deleteUser, fetchUserById, resetPasswordEmail, updateCurrentUser, getUpcomingLessons } from "../services/api";
import { useAuth } from "../context/AuthContext";
import VocabularyList from "../components/vocabulary/VocabularyList";
import { useDictionary } from "../hooks/useVocabulary";
import { useAssignments } from "../hooks/useAssignments";
import SearchIcon from "@mui/icons-material/Search";
import { TextField, InputAdornment } from "@mui/material";
import { Lesson } from "../types/Lesson";
import NextLessonCard from "../components/dashboard/NextLessonCard";
import AssignModal from "../components/vocabulary/AssignModal";
import { useStudentAssignments } from "../hooks/useHomeworks";
import type { AssignmentDto } from "../types/homework";
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const AssignmentCardSmall: React.FC<{ a: AssignmentDto; onOpen: (assignment: AssignmentDto) => void }> = ({ a, onOpen }) => {
  const total = a.tasks.length;
  const done = a.tasks.filter(t => t.status === 'COMPLETED').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const due = a.dueAt ? new Date(a.dueAt) : null;
  const handleActivate = () => onOpen(a);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(a);
    }
  };
  return (
    <Paper
      variant="outlined"
      sx={{ p:2, height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth:0 }}>
          <Typography variant="subtitle1" noWrap>{a.title}</Typography>
          {a.instructions && (
            <Typography variant="body2" color="text.secondary" noWrap>{a.instructions}</Typography>
          )}
          {due && <Typography variant="caption" color="text.secondary">Due: {due.toLocaleDateString()}</Typography>}
        </Box>
        <Box textAlign="center">
          <Typography variant="caption">{done}/{total}</Typography>
          <Box sx={{ mt:0.5 }}>
            <Chip size="small" label={`${pct}%`} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const StudentHomeworkTab: React.FC<{ studentId: string; isTeacher: boolean; onAssignmentOpen: (assignment: AssignmentDto) => void }> = ({ studentId, isTeacher, onAssignmentOpen }) => {
  const { data, isLoading, isError } = useStudentAssignments(studentId, undefined);
  if (isLoading) return <Typography>Loading...</Typography>;
  if (isError) return <Typography color="error">Failed to load homework.</Typography>;
  const list = data?.content || [];
  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">Homework assigned to this student.</Typography>
      {isTeacher && (
        <Button component={RouterLink} to={`/t/homework/new?studentId=${studentId}`} variant="contained" size="small">Assign new homework</Button>
      )}
    </Box>
  );

  if (list.length === 0) {
    return (
      <>
        {header}
        <Box textAlign="center" py={4}>
          <Typography variant="subtitle1">No homework yet</Typography>
          <Typography variant="body2" color="text.secondary">Use the button above to assign a new homework.</Typography>
        </Box>
      </>
    );
  }
  return (
    <>
      {header}
      <Grid container spacing={2}>
        {list.map(a => (
          <Grid size={{xs: 12, md:6}} key={a.id}>
            <AssignmentCardSmall a={a} onOpen={onAssignmentOpen} />
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  level?: EnglishLevel;
}

const SectionCard: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <Paper elevation={1} sx={{ p: 2, borderRadius: 1 }}>
    <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Box>{children}</Box>
  </Paper>
);

export interface StudentPageProps {
  studentIdOverride?: string;
  embedded?: boolean;
  onClose?: () => void;
  activeTabOverride?: number;
  onTabChange?: (tab: number) => void;
  initialTab?: number;
  hideOverviewTab?: boolean;
}

const StudentPage: React.FC<StudentPageProps> = ({
  studentIdOverride,
  embedded = false,
  onClose,
  activeTabOverride,
  onTabChange,
  initialTab = 0,
  hideOverviewTab = false,
}) => {
  const { studentId: routeStudentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const fullScreenPreview = useMediaQuery(theme.breakpoints.down('sm'));

  const resolvedStudentId = studentIdOverride ?? routeStudentId;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabState, setActiveTabState] = useState(initialTab);
  const activeTab = activeTabOverride ?? activeTabState;
  const [previewAssignment, setPreviewAssignment] = useState<AssignmentDto | null>(null);

  // Next lesson state
  const [upcoming, setUpcoming] = useState<Lesson[] | null>(null);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  // Actions state (dialogs/snackbar)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; level: EnglishLevel } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);

  const isTeacher = user?.role === "tutor";

  // Dictionary data for this student (list view)
  const { data: allWords = [] } = useDictionary();
  const { data: assignments = [] } = useAssignments(student?.id || "");
  const assignedIds = useMemo(() => new Set<string>(assignments.map((a: any) => a.vocabularyWordId)), [assignments]);
  const assignedWords = useMemo(() => allWords.filter((w: any) => assignedIds.has(w.id)), [allWords, assignedIds]);
  const [dictSearch, setDictSearch] = useState("");
  const filteredAssigned = useMemo(
    () => assignedWords.filter((w: any) => w.text?.toLowerCase().includes(dictSearch.toLowerCase())),
    [assignedWords, dictSearch]
  );

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);

  const handleAssignmentOpen = useCallback(
    (assignment: AssignmentDto) => {
      if (embedded) {
        setPreviewAssignment(assignment);
      } else {
        navigate(`/homework/${assignment.id}`);
      }
    },
    [embedded, navigate],
  );

  const handlePreviewClose = () => setPreviewAssignment(null);

  useEffect(() => {
    const load = async () => {
      if (!resolvedStudentId) return;
      try {
        setLoading(true);
        const data = await fetchUserById(resolvedStudentId);
        // Map to StudentProfile; level may come as string
        const mapped: StudentProfile = {
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          level: (data.level as EnglishLevel) || undefined,
        };
        setStudent(mapped);
        setForm({ name: mapped.name, email: mapped.email ?? "", level: mapped.level || ("Beginner" as EnglishLevel) });
      } catch (e) {
        console.error("Failed to load student", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resolvedStudentId]);

  // Load upcoming lessons for this student
  useEffect(() => {
    const fetchUpcoming = async () => {
      if (!user || !resolvedStudentId) return;
      try {
        setUpcomingError(null);
        setUpcoming(null);
        const tutorId = user.id; // assume tutorId is always the same
        const now = new Date().toISOString();
        const res = await getUpcomingLessons(tutorId, resolvedStudentId, now);
        setUpcoming(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to fetch upcoming lessons", err);
        setUpcoming([]);
        setUpcomingError("Failed to load next lesson");
      }
    };
    fetchUpcoming();
  }, [user, resolvedStudentId]);

  const levelInfo = useMemo(() => (student?.level ? ENGLISH_LEVELS[student.level] : undefined), [student?.level]);

  const handleSaveEdit = async () => {
    if (!student || !form) return;
    try {
      setSubmitting(true);
      await updateCurrentUser(student.id, { name: form.name, email: form.email, level: form.level });
      setStudent({ ...student, name: form.name, email: form.email, level: form.level });
      setSnackbarMessage("Student updated successfully.");
      setSnackbarSeverity("success");
      setEditDialogOpen(false);
    } catch (e) {
      console.error(e);
      setSnackbarMessage("Failed to update student.");
      setSnackbarSeverity("error");
    } finally {
      setSubmitting(false);
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    try {
      setSubmitting(true);
      await deleteUser(student.id);
      setSnackbarMessage("Student deleted.");
      setSnackbarSeverity("success");
      setDeleteDialogOpen(false);
      setTimeout(() => navigate("/my-students"), 300);
    } catch (e) {
      console.error(e);
      setSnackbarMessage("Failed to delete student.");
      setSnackbarSeverity("error");
    } finally {
      setSubmitting(false);
      setSnackbarOpen(true);
    }
  };

  const handleResetPassword = async () => {
    if (!student) return;
    if (!student.email) {
      setResetDialogOpen(false);
      setSnackbarMessage("This student has no email.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    try {
      setSubmitting(true);
      await resetPasswordEmail(student.email);
      setSnackbarMessage("Reset password email sent.");
      setSnackbarSeverity("success");
      setResetDialogOpen(false);
    } catch (e) {
      console.error(e);
      setSnackbarMessage("Failed to send reset email.");
      setSnackbarSeverity("error");
    } finally {
      setSubmitting(false);
      setSnackbarOpen(true);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, value: number) => {
    onTabChange?.(value);
    if (activeTabOverride === undefined) {
      setActiveTabState(value);
    }
  };

  const tabDefinitions = useMemo(() => {
    if (!student) {
      return [];
    }
    return [
      {
        label: "Overview",
        hidden: hideOverviewTab,
        content: (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <SectionCard title="Next lesson">
                {upcoming === null ? (
                  <Typography variant="body2" color="text.secondary">Loading next lesson…</Typography>
                ) : upcomingError ? (
                  <Typography variant="body2" color="error.main">{upcomingError}</Typography>
                ) : upcoming.length > 0 ? (
                  <NextLessonCard lesson={upcoming[0]} />
                ) : (
                  <Typography variant="body2" color="text.secondary">No next lesson scheduled.</Typography>
                )}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard title="Progress">
                <Typography variant="body2" color="text.secondary">Progress charts and stats will appear here.</Typography>
              </SectionCard>
            </Grid>
          </Grid>
        ),
      },
      {
        label: "Homework",
        hidden: false,
        content: (
          <SectionCard title="Assigned homework">
            <StudentHomeworkTab studentId={student.id} isTeacher={isTeacher} onAssignmentOpen={handleAssignmentOpen} />
          </SectionCard>
        ),
      },
      {
        label: "Dictionary",
        hidden: false,
        content: (
          <SectionCard title="Dictionary">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">Manage student vocabulary.</Typography>
              {isTeacher && (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setAssignOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Assign words
                </Button>
              )}
            </Box>
            <Box sx={{ mb: 2, maxWidth: 420 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search words…"
                value={dictSearch}
                onChange={(e) => setDictSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
              <VocabularyList data={filteredAssigned} readOnly />
            </Box>

            {/* Assign words modal */}
            <AssignModal
              open={assignOpen}
              studentId={student.id}
              onClose={() => setAssignOpen(false)}
            />
          </SectionCard>
        ),
      },
      {
        label: "Activity",
        hidden: false,
        content: (
          <SectionCard title="Activity">
            <Typography variant="body2" color="text.secondary">Recent activity and notes will be shown here.</Typography>
          </SectionCard>
        ),
      },
    ];
  }, [student, hideOverviewTab, upcoming, upcomingError, isTeacher, handleAssignmentOpen, dictSearch, filteredAssigned, assignOpen]);

  const visibleTabs = tabDefinitions.filter((tab) => !tab.hidden);
  const effectiveActiveTab = Math.min(activeTab, Math.max(visibleTabs.length - 1, 0));

  useEffect(() => {
    if (activeTabOverride !== undefined) return;
    if (effectiveActiveTab !== activeTabState) {
      setActiveTabState(effectiveActiveTab);
    }
  }, [activeTabOverride, activeTabState, effectiveActiveTab]);

  if (!resolvedStudentId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Typography color="error">No student selected</Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!student) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Typography color="error">Student not found</Typography>
      </Container>
    );
  }

  const containerSx = embedded
    ? {
        mt: 0,
        mb: 0,
        py: 2,
        px: { xs: 0, sm: 1.5 },
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
      }
    : { mt: 4, mb: 6 };

  const contentSx = embedded
    ? { mt: 2, flex: 1, overflowY: "auto", pr: { xs: 0, sm: 1 } }
    : { mt: 2 };

  return (
    <Container maxWidth={embedded ? false : "lg"} sx={containerSx}>
      {/* Header bar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          {!embedded && (
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
          )}
          {embedded && onClose && (
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
          <Avatar
            src={student.avatar}
            alt={student.name}
            sx={{ width: 64, height: 64, bgcolor: (t) => t.palette.primary.light }}
          />
          <Box>
            <Typography variant="h5" fontWeight={800}>{student.name}</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {student.level && (
                <Tooltip title={levelInfo?.description || ""}>
                  <Chip
                    label={`${student.level} ${levelInfo?.code ? `(${levelInfo.code})` : ""}`}
                    size="small"
                    sx={{ bgcolor: "#f0f4ff", color: "#1e3a8a", fontWeight: 700, borderRadius: 1 }}
                  />
                </Tooltip>
              )}
              <Typography variant="body2" color="text.secondary">{student.email || '—'}</Typography>
            </Box>
          </Box>
        </Box>
        {isTeacher && (
          <Box display="flex" gap={1}>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => setEditDialogOpen(true)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            {student.email && (
              <Tooltip title="Send password reset email">
                <IconButton color="info" onClick={() => setResetDialogOpen(true)}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 1, bgcolor: (t) => t.palette.background.paper }}>
        <Tabs
          value={effectiveActiveTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={contentSx}>
        {visibleTabs[effectiveActiveTab]?.content}
      </Box>

      <Dialog
        open={Boolean(previewAssignment)}
        onClose={handlePreviewClose}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreenPreview}
      >
        {previewAssignment && (
          <>
            <DialogTitle>{previewAssignment.title}</DialogTitle>
            <DialogContent dividers>
              {previewAssignment.instructions && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {previewAssignment.instructions}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                <Chip label={`Tasks: ${previewAssignment.tasks.length}`} size="small" color="primary" />
                {previewAssignment.dueAt && (
                  <Chip
                    label={`Due ${new Date(previewAssignment.dueAt).toLocaleString()}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {previewAssignment.tasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    This homework does not contain any tasks yet.
                  </Typography>
                ) : (
                  previewAssignment.tasks.map((task) => (
                    <Paper key={task.id} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>{task.title}</Typography>
                          {task.instructions && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {task.instructions}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={task.type.toLowerCase()}
                          size="small"
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handlePreviewClose}>Close</Button>
              <Button
                component="a"
                href={`/homework/${previewAssignment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
              >
                Open full homework
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 1,
          }
        }}
      >
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <input
              style={{ padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', width: '100%' }}
              value={form?.name || ''}
              onChange={(e) => setForm((prev) => ({ ...(prev as any), name: e.target.value }))}
            />
            <Typography variant="caption" color="text.secondary">Email</Typography>
            <input
              style={{ padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', width: '100%' }}
              value={form?.email || ''}
              onChange={(e) => setForm((prev) => ({ ...(prev as any), email: e.target.value }))}
            />
            <Typography variant="caption" color="text.secondary">Level</Typography>
            <select
              style={{ padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', width: '100%' }}
              value={form?.level || ("Beginner" as EnglishLevel)}
              onChange={(e) => setForm((prev) => ({ ...(prev as any), level: e.target.value as EnglishLevel }))}
            >
              {Object.entries(ENGLISH_LEVELS).map(([key, val]) => (
                <option key={key} value={key}>{`${key} (${val.code})`}</option>
              ))}
            </select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Student</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove &#34;{student.name}&#34;?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Resend password reset email</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to resend a reset password email to &#34;{student.email}&#34;?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleResetPassword} color="warning" disabled={submitting}>
            {submitting ? 'Sending...' : 'Resend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentPage;
