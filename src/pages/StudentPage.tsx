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
    Stack,
    CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { ENGLISH_LEVELS, EnglishLevel } from "../types/ENGLISH_LEVELS";
import { deleteUser, fetchUserById, resetPasswordEmail, updateCurrentUser, getUpcomingLessons, getTeacherByStudentId } from "../services/api";
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
import type { AssignmentDto, TaskDto } from "../types/homework";
import HomeworkTaskFrame from "../components/homework/HomeworkTaskFrame";
import FiltersBar, { FiltersState } from "../components/homework/FiltersBar";
import { getAssignmentById } from "../services/homework";

import type { AssignmentListItemDto } from "../types/homework";
import HomeworkComposerDrawer from "../components/homework/HomeworkComposerDrawer";
import PreviousLessonNotesTab from "../features/notes/components/PreviousLessonNotesTab";
import { getTaskTypeLabels } from "../utils/homeworkTaskTypes";

const EMPTY_ARRAY: any[] = [];

const AssignmentCardSmall: React.FC<{ a: AssignmentListItemDto; onOpen: (id: string) => void; compact?: boolean }> = ({ a, onOpen, compact }) => {
  const total = a.totalTasks;
  const done = a.completedTasks;
  const pct = a.progressPct ?? (total ? Math.round((done / total) * 100) : 0);
  const due = a.dueAt ? new Date(a.dueAt) : null;
  const taskTypes = useMemo(() => getTaskTypeLabels(a.tasks), [a.tasks]);
  const handleActivate = () => onOpen(a.id);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(a.id);
    }
  };
  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.25 : 2,
        height: '100%',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: compact ? 1 : 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant={compact ? 'subtitle2' : 'subtitle1'} noWrap fontWeight={600}>{a.title}</Typography>
        {taskTypes.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.25 }}>
            {taskTypes.map((label) => (
              <Chip key={label} size="small" variant="outlined" label={label} />
            ))}
          </Stack>
        )}
        {a.instructions && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: compact ? 12 : undefined }}>{a.instructions}</Typography>
        )}
        {due && (
          <Typography variant="caption" color="text.secondary">
            Due {due.toLocaleDateString()}
          </Typography>
        )}
      </Box>
      <Box textAlign="right" sx={{ minWidth: 72 }}>
        <Typography variant="body2" fontWeight={600}>{done}/{total}</Typography>
        <Chip size="small" label={`${pct}%`} />
      </Box>
    </Paper>
  );
};

const StudentHomeworkTab: React.FC<{ studentId: string; isTeacher: boolean; onAssignmentOpen: (assignmentId: string, preselectTaskId?: string | null) => void; autoOpenAssignmentId?: string | null; autoOpenTaskId?: string | null; onConsumedAutoOpen?: () => void; embedded: boolean; }> = ({ studentId, isTeacher, onAssignmentOpen, autoOpenAssignmentId, autoOpenTaskId, onConsumedAutoOpen, embedded}) => {

    const [composerOpen, setComposerOpen] = useState(false);
    const [filters, setFilters] = useState<FiltersState>({
        status: 'all',
        range: 'custom',
        hideCompleted: true,
        sort: 'assignedDesc',
    });
    const [filtersApplied, setFiltersApplied] = useState(false);

    const computeRange = (f: FiltersState) => {
        const now = new Date();
        const toYMD = (d: Date) => d.toISOString().slice(0,10);
        const presetToRange = (preset: string) => {
            const end = toYMD(now);
            if (preset === 'thisMonth') {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                return { from: toYMD(d), to: end };
            }
            const days = preset === 'last14' ? 13 : preset === 'last30' ? 29 : 6;
            const startMs = Date.now() - days * 24 * 60 * 60 * 1000;
            return { from: toYMD(new Date(startMs)), to: end };
        };
        if (f.range === 'custom' && f.from && f.to) return { from: f.from, to: f.to };
        if (f.range !== 'custom') return presetToRange(f.range);
        return presetToRange('last7');
    };

  const { from, to } = computeRange(filters);
  const sortMap: Record<string, 'assigned_desc' | 'assigned_asc' | 'due_asc' | 'due_desc'> = {
    assignedDesc: 'assigned_desc',
    assignedAsc: 'assigned_asc',
    dueAsc: 'due_asc',
    dueDesc: 'due_desc',
  };

  const effectiveParams = React.useMemo(() => {
    if (!filtersApplied) {
      return {
        status: 'all' as const,
        includeOverdue: true,
        sort: 'assigned_desc' as const,
        view: 'full' as const,
        size: 10,
      };
    }
    return {
      status: (filters?.status as any) || 'active',
      from,
      to,
      includeOverdue: true,
      hideCompleted: filters?.hideCompleted ?? (filters?.status === 'active'),
      sort: sortMap[filters?.sort || 'assignedDesc'],
      view: 'full' as const,
      size: 100,
    };
  }, [filtersApplied, filters?.status, filters?.hideCompleted, from, to, filters?.sort]);

  const { data, isLoading, isError, refetch } = useStudentAssignments(studentId, effectiveParams);
  const list = data?.content || [];

  // auto open command from parent (student sync)
  React.useEffect(() => {
    if (!autoOpenAssignmentId) return;

      onAssignmentOpen(autoOpenAssignmentId, autoOpenTaskId ?? null);
      onConsumedAutoOpen?.();

  }, [autoOpenAssignmentId, autoOpenTaskId, onAssignmentOpen, onConsumedAutoOpen]);

  if (isLoading) return <Typography>Loading...</Typography>;
  if (isError) return <Typography color="error">Failed to load homework.</Typography>;

  const header = (
    <Stack spacing={1.25}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        {isTeacher && !embedded && (
          <Button onClick={() => setComposerOpen(true)} variant="contained" size="small">Assign new homework</Button>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 260 }}>
        <FiltersBar
          value={filters}
          onChange={(f) => { setFiltersApplied(true); setFilters(f); }}
          collapsed={embedded}
        />
      </Box>
      <HomeworkComposerDrawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        prefillStudentId={studentId}
        onSuccess={() => {
          setComposerOpen(false);
          refetch();
        }}
        onCreateAndOpen={(assignment) => {
          setComposerOpen(false);
          onAssignmentOpen(assignment.id);
        }}
      />
    </Stack>
  );

  if (list.length === 0) {
    return (
      <>
        {header}
        <Box textAlign="center" py={embedded ? 2 : 4}>
          <Typography variant="subtitle1">No homework yet</Typography>
          <Typography variant="body2" color="text.secondary">Use the button above to assign a new homework.</Typography>
        </Box>
      </>
    );
  }
  const listContent = embedded ? (
    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
      {list.map((a: AssignmentListItemDto) => (
        <AssignmentCardSmall key={a.id} a={a} onOpen={(id) => onAssignmentOpen(id)} compact />
      ))}
    </Stack>
  ) : (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {list.map((a: AssignmentListItemDto) => (
        <Grid size={{ xs: 12, md: 6 }} key={a.id}>
          <AssignmentCardSmall a={a} onOpen={(id) => onAssignmentOpen(id)} />
        </Grid>
      ))}
    </Grid>
  );
  return (
    <>
      {header}
      {listContent}
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
  insideDrawer?: boolean;
  onClose?: () => void;
  activeTabOverride?: number;
  onTabChange?: (tab: number) => void;
  initialTab?: number;
  hideOverviewTab?: boolean;
  // sync hooks: open word and homework via commands
  openWordId?: string | null;
  onConsumeOpenWordCommand?: () => void;
  autoOpenAssignmentId?: string | null;
  autoOpenTaskId?: string | null;
  onConsumeOpenAssignmentCommand?: () => void;
  onEmbeddedAssignmentOpen?: (assignment: AssignmentDto, preselectTaskId?: string | null) => void;
  onWordOpen?: (wordId: string) => void;
  onEmbeddedAssignmentClose?: () => void;
  closeEmbeddedAssignment?: boolean;
  onConsumeCloseEmbeddedAssignment?: () => void;
  onWordPronounce?: (id: string, audioUrl: string) => void;
  headerAccessory?: React.ReactNode;
}

const StudentPage: React.FC<StudentPageProps> = ({
  studentIdOverride,
  embedded = false,
  insideDrawer = false,
  onClose,
  activeTabOverride,
  onTabChange,
  initialTab = 0,
  hideOverviewTab = false,
  openWordId,
  onConsumeOpenWordCommand,
  autoOpenAssignmentId,
  autoOpenTaskId,
  onConsumeOpenAssignmentCommand,
  onEmbeddedAssignmentOpen,
  onWordOpen,
  onEmbeddedAssignmentClose,
  closeEmbeddedAssignment,
  onConsumeCloseEmbeddedAssignment,
  onWordPronounce,
  headerAccessory,
}) => {
  const { studentId: routeStudentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const resolvedStudentId = studentIdOverride ?? routeStudentId;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabState, setActiveTabState] = useState(initialTab);
  const [tabInitialized, setTabInitialized] = useState(false);
  const activeTab = activeTabOverride ?? activeTabState;
  const [openedAssignment, setOpenedAssignment] = useState<AssignmentDto | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const currentTask = useMemo(() => (openedAssignment?.tasks.find(t => t.id === currentTaskId) || null) as TaskDto | null, [openedAssignment, currentTaskId]);

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
  const [notesTeacherId, setNotesTeacherId] = useState<string | null>(null);
  const [notesTeacherLoading, setNotesTeacherLoading] = useState(false);
  const [notesTeacherError, setNotesTeacherError] = useState<string | null>(null);

  // Dictionary data for this student (list view)
  const { data: assignments = EMPTY_ARRAY } = useAssignments(student?.id || "");
  const assignedWordIds = useMemo(() => assignments.map(a => a.vocabularyWordId), [assignments]);
  const { data: wordsPage } = useDictionary(
      { ids: assignedWordIds, size: Math.max(assignedWordIds.length, 1) },
      { enabled: !!student?.id && assignedWordIds.length > 0 }
  );
  const assignedWords = wordsPage?.content ?? EMPTY_ARRAY;

  const [dictSearch, setDictSearch] = useState("");
  const filteredAssigned = useMemo(
    () => assignedWords.filter((w: any) => w.text?.toLowerCase().includes(dictSearch.toLowerCase())),
    [assignedWords, dictSearch]
  );

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);

  const handleAssignmentOpen = useCallback(
    async (assignmentId: string, preselectTaskId?: string | null) => {
      if (embedded) {
        try {
          const full = await getAssignmentById(assignmentId);
          setOpenedAssignment(full);
          const first = preselectTaskId || ([...full.tasks].sort((a,b)=>a.ordinal-b.ordinal)[0]?.id || full.tasks[0]?.id || null);
          setCurrentTaskId(first);
          onEmbeddedAssignmentOpen?.(full, first);
        } catch (e) {
          console.error('Failed to load assignment', e);
        }
      } else {
        navigate(`/homework/${assignmentId}`);
      }
    },
    [embedded, navigate, onEmbeddedAssignmentOpen]
  );

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

  useEffect(() => {
    if (!resolvedStudentId) {
      setNotesTeacherId(null);
      setNotesTeacherLoading(false);
      setNotesTeacherError(null);
      return;
    }
    if (isTeacher && user?.id) {
      setNotesTeacherId(user.id);
      setNotesTeacherLoading(false);
      setNotesTeacherError(null);
      return;
    }
    let cancelled = false;
    const fetchTeacher = async () => {
      try {
        setNotesTeacherLoading(true);
        setNotesTeacherError(null);
        const response = await getTeacherByStudentId(resolvedStudentId);
        if (cancelled) return;
        const teacherId =
          response?.id ??
          response?.teacherId ??
          response?.tutorId ??
          response?.userId ??
          null;
        setNotesTeacherId(typeof teacherId === 'string' ? teacherId : null);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch teacher for notes', err);
          setNotesTeacherId(null);
          setNotesTeacherError('Unable to load teacher information.');
        }
      } finally {
        if (!cancelled) {
          setNotesTeacherLoading(false);
        }
      }
    };
    fetchTeacher();
    return () => {
      cancelled = true;
    };
  }, [resolvedStudentId, isTeacher, user?.id]);

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

    useEffect(() => {
      if (!embedded) return;
      if (closeEmbeddedAssignment) {
        setOpenedAssignment(null);
        setCurrentTaskId(null);
        onConsumeCloseEmbeddedAssignment?.(); // consume the flag
      }
    }, [embedded, closeEmbeddedAssignment, onConsumeCloseEmbeddedAssignment]);

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

  const persistTab = (tab: number) => {
    if (!resolvedStudentId || activeTabOverride !== undefined) return;
    try {
      sessionStorage.setItem(`studentPage:lastTab:${resolvedStudentId}`, String(tab));
    } catch {
      // ignore storage failures
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, value: number) => {
    onTabChange?.(value);
    if (activeTabOverride === undefined) {
      setActiveTabState(value);
      persistTab(value);
    }
  };

  useEffect(() => {
    if (activeTabOverride !== undefined) {
      setTabInitialized(true);
      return;
    }
    if (!resolvedStudentId) return;
    try {
      const saved = sessionStorage.getItem(`studentPage:lastTab:${resolvedStudentId}`);
      if (saved !== null) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed)) {
          setActiveTabState(parsed);
        }
      } else {
        setActiveTabState(initialTab);
      }
    } catch {
      // ignore storage failures
    } finally {
      setTabInitialized(true);
    }
  }, [activeTabOverride, resolvedStudentId, initialTab]);

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
          <Box>
            {embedded && openedAssignment ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => { setOpenedAssignment(null); setCurrentTaskId(null); onEmbeddedAssignmentClose?.(); }}>
                    Back to list
                  </Button>
                  <Typography variant="subtitle1" fontWeight={700}>{openedAssignment.title}</Typography>
                </Box>
                {openedAssignment.tasks.length > 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.75,
                      overflowX: 'auto',
                      pb: 0.5,
                      mb: 1.5,
                    }}
                  >
                    {[...openedAssignment.tasks].sort((a,b)=>a.ordinal-b.ordinal).map(t => (
                      <Button
                        key={t.id}
                        variant={t.id===currentTaskId? 'contained':'outlined'}
                        size="small"
                        sx={{ flexShrink: 0, textTransform: 'none' }}
                        onClick={() => setCurrentTaskId(t.id)}
                      >
                        {t.ordinal}. {t.title}
                      </Button>
                    ))}
                  </Box>
                )}
                {currentTask && (
                  <Box sx={{ width: '100%' }}>
                    <HomeworkTaskFrame assignment={openedAssignment as AssignmentDto} task={currentTask as TaskDto} readOnly={isTeacher} />
                  </Box>
                )}
              </>
            ) : (
              <StudentHomeworkTab studentId={student.id} isTeacher={isTeacher} onAssignmentOpen={handleAssignmentOpen} autoOpenAssignmentId={autoOpenAssignmentId} autoOpenTaskId={autoOpenTaskId} onConsumedAutoOpen={onConsumeOpenAssignmentCommand} embedded = {embedded} />
            )}
          </Box>
        ),
      },
      {
        label: "Dictionary",
        hidden: false,
        content: (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {isTeacher && !embedded && (
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
              <VocabularyList data={filteredAssigned} readOnly onWordOpen={onWordOpen} openWordId={openWordId} onWordDialogClose={onConsumeOpenWordCommand} onWordPronounce={onWordPronounce}/>
            </Box>

            {/* Assign words modal */}
            <AssignModal
              open={assignOpen}
              studentId={student.id}
              onClose={() => setAssignOpen(false)}
            />
          </Box>
        ),
      },
      {
        label: "Notes",
        hidden: false,
        content: (
          <Box sx={{ mt: embedded ? 1 : 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {notesTeacherLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Loading notes…</Typography>
              </Box>
            ) : !student || !notesTeacherId ? (
              <Alert severity={notesTeacherError ? 'error' : 'info'}>
                {notesTeacherError ?? 'Notes are unavailable for this student.'}
              </Alert>
            ) : (
              <PreviousLessonNotesTab
                studentId={student.id}
                teacherId={notesTeacherId}
                isActive
              />
            )}
          </Box>
        ),
      },
/*      {
        label: "Activity",
        hidden: false,
        content: (
          <SectionCard title="Activity">
            <Typography variant="body2" color="text.secondary">Recent activity and notes will be shown here.</Typography>
          </SectionCard>
        ),
      },*/
    ];
  }, [
    student,
    hideOverviewTab,
    upcoming,
    upcomingError,
    isTeacher,
    handleAssignmentOpen,
    dictSearch,
    filteredAssigned,
    assignOpen,
    openedAssignment,
    currentTaskId,
    openWordId,
    onConsumeOpenWordCommand,
    autoOpenAssignmentId,
    autoOpenTaskId,
    onConsumeOpenAssignmentCommand,
    notesTeacherId,
    notesTeacherLoading,
    notesTeacherError
  ]);

  const visibleTabs = tabDefinitions.filter((tab) => !tab.hidden);
  const effectiveActiveTab = Math.min(activeTab, Math.max(visibleTabs.length - 1, 0));

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

  const isDrawerEmbed = embedded && insideDrawer;

  const containerSx = embedded
    ? {
        mt: 0,
        mb: 0,
        py: isDrawerEmbed ? 0 : 2,
        px: isDrawerEmbed ? 0 : { xs: 0, sm: 1.5 },
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
        backgroundColor: isDrawerEmbed ? 'background.paper' : undefined,
      }
    : { mt: 2, mb: 2, bgcolor: '#fafbfd', height: '100%'};

  const bodySx = embedded
    ? {
        mt: 0,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        py: isDrawerEmbed ? 1 : 1.5,
        px: isDrawerEmbed ? 1 : { xs: 0, sm: 1 },
      }
    : { mt: 2 };

  const headerBlock = (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: embedded ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: embedded ? 1 : 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} sx={{ flex: 1, minWidth: 0 }}>
          {!embedded && (
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
          )}
          {embedded && onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          <Avatar
            src={student.avatar || undefined}
            alt={student.name}
            sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: (t) => t.palette.primary.light }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>{student.name}</Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              {student.level && (
                <Tooltip title={levelInfo?.description || ""}>
                  <Chip
                    label={`${student.level}${levelInfo?.code ? ` (${levelInfo.code})` : ""}`}
                    size="small"
                    sx={{ bgcolor: "#f0f4ff", color: "#1e3a8a", fontWeight: 700, borderRadius: 1 }}
                  />
                </Tooltip>
              )}
              <Typography variant="body2" color="text.secondary" noWrap>{student.email || '—'}</Typography>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {headerAccessory}
          {isTeacher && !embedded && (
            <>
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
            </>
          )}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => t.palette.background.paper,
          px: 1,
        }}
      >
        <Tabs
          value={effectiveActiveTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 44 }}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} sx={{ minHeight: 44 }} />
          ))}
        </Tabs>
      </Paper>
    </>
  );

  const headerSection = embedded ? (
    <Box
      sx={{
        position: insideDrawer ? 'relative' : 'sticky',
        top: insideDrawer ? 'auto' : 0,
        zIndex: insideDrawer ? 1 : 4,
        borderBottom: insideDrawer ? 'none' : '1px solid',
        borderColor: 'divider',
        boxShadow: insideDrawer ? 'none' : (t) => t.shadows[1],
        backgroundColor: (t) => (insideDrawer ? t.palette.background.paper : t.palette.background.default),
        px: insideDrawer ? 1 : 0,
        pt: insideDrawer ? 1 : 0,
      }}
    >
      {headerBlock}
    </Box>
  ) : headerBlock;

  return (
      <Box
          sx={{
            p: { xs: 2, sm: 2 },
            bgcolor: '#fafbfd',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
      >
      {headerSection}

      <Box sx={bodySx}>
        {visibleTabs[effectiveActiveTab]?.content}
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
    </Box>
  );
};

export default StudentPage;
