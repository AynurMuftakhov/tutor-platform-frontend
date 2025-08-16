import React, { useEffect, useMemo, useState } from "react";
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
import MenuBookIcon from "@mui/icons-material/MenuBook";
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

// Reuse Student type shape from MyStudentsPage where possible
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
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

const StudentPage: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

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

  useEffect(() => {
    const load = async () => {
      if (!studentId) return;
      try {
        setLoading(true);
        const data = await fetchUserById(studentId);
        // Map to StudentProfile; level may come as string
        const mapped: StudentProfile = {
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          level: (data.level as EnglishLevel) || undefined,
        };
        setStudent(mapped);
        setForm({ name: mapped.name, email: mapped.email, level: mapped.level || ("Beginner" as EnglishLevel) });
      } catch (e) {
        console.error("Failed to load student", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId]);

  // Load upcoming lessons for this student
  useEffect(() => {
    const fetchUpcoming = async () => {
      if (!user || !studentId) return;
      try {
        setUpcomingError(null);
        setUpcoming(null);
        const tutorId = user.id; // assume tutorId is always the same
        const now = new Date().toISOString();
        const res = await getUpcomingLessons(tutorId, studentId, now);
        setUpcoming(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to fetch upcoming lessons", err);
        setUpcoming([]);
        setUpcomingError("Failed to load next lesson");
      }
    };
    fetchUpcoming();
  }, [user, studentId]);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header bar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
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
              <Typography variant="body2" color="text.secondary">{student.email}</Typography>
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
            <Tooltip title="Send Reset Password Link">
              <IconButton color="info" onClick={() => setResetDialogOpen(true)}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
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
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          <Tab label="Overview" />
          <Tab label="Homework" />
          <Tab label="Dictionary" />
          <Tab label="Activity" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
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
        )}

        {activeTab === 1 && (
          <SectionCard title="Assigned homework">
            <Typography variant="body2" color="text.secondary">Homework assignments will be listed here.</Typography>
          </SectionCard>
        )}

        {activeTab === 2 && (
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
        )}

        {activeTab === 3 && (
          <SectionCard title="Activity">
            <Typography variant="body2" color="text.secondary">Recent activity and notes will be shown here.</Typography>
          </SectionCard>
        )}
      </Box>

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
