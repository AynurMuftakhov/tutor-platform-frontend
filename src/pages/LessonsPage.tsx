import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Button,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Menu,
    Chip,
    Paper,
    Tab,
    Tabs,
    useTheme,
    alpha,
    Badge,
    Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
    fetchStudents, 
    deleteLesson, 
    getLessons, 
    fetchUserById, 
    getLessonCountsByMonth,
    LessonCountsByDay
} from "../services/api";
import AddLessonModal from "../components/AddLessonModal";
import { useAuth } from "../context/AuthContext";
import { Student } from "./MyStudentsPage";
import { useNavigate } from "react-router-dom";
import { FilterList, ViewList, CalendarMonth, Event } from "@mui/icons-material";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import dayjs from "dayjs";

const LessonsPage = () => {
    const [lessons, setLessons] = useState<any[]>([]);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [tutorsMap, setTutorsMap] = useState<Map<string, string>>(new Map());
    const [lessonToDelete, setLessonToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const statusFilterOpen = Boolean(anchorEl);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
    const theme = useTheme();

    // State for month lesson counts
    const [monthLessonCounts, setMonthLessonCounts] = useState<LessonCountsByDay>({});
    const [loadingMonthCounts, setLoadingMonthCounts] = useState(false);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalLessons, setTotalLessons] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleStatusFilterClose = () => {
        setAnchorEl(null);
    };

    const handleStatusSelect = (value: string) => {
        setStatus(value);
        setPage(0);
        handleStatusFilterClose();
    };

    const refreshLessons = async () => {
        setLoading(true);
        try {
            const studentId = user?.role === "student" ? user?.id : undefined;
            const tutorId = user?.role === "tutor" ? user?.id : undefined;
            const dateParam = viewMode === 'calendar' ? selectedDate.format('YYYY-MM-DD') : undefined;
            const result = await getLessons(studentId as string, tutorId as string, status, page, pageSize, dateParam);

            const lessons = result.content;
            setLessons(lessons);
            setTotalLessons(result.totalElements);

            if (user?.role === "student") {
                const uniqueTutorIds = Array.from(new Set(lessons.map((lesson: any) => lesson.tutorId)));

                const newMap = new Map<string, string>();

                await Promise.all(
                    uniqueTutorIds.map(async (id) => {
                        const name = await fetchTutorNameById(id as string);
                        if (name) newMap.set(id as string, name);
                    })
                );

                setTutorsMap(newMap);
            }
        } catch (e) {
            console.error("Failed to fetch lessons", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete || !user) return;
        try {
            setDeleting(true);
            await deleteLesson(lessonToDelete.id);
            await refreshLessons();
            if (viewMode === 'calendar') {
                await fetchMonthLessonCounts();
            }
            setLessonToDelete(null);
        } catch (e) {
            console.error("Failed to delete lesson", e);
        } finally {
            setDeleting(false);
        }
    };

    const getStudentById = (id: string) => {
        return students.find((s) => s.id === id);
    };

    const fetchTutorNameById = async (id: string): Promise<string | null> => {
        try {
            const data = await fetchUserById(id);
            return data.name;
        } catch (e) {
            console.error(`Failed to fetch tutor for ID ${id}`, e);
            return null;
        }
    };

    // Function to fetch lesson counts for the current month
    const fetchMonthLessonCounts = async () => {
        if (!user) return;

        setLoadingMonthCounts(true);
        try {
            const year = selectedDate.year();
            const month = selectedDate.month() + 1; // dayjs months are 0-indexed

            const studentId = user?.role === "student" ? user?.id : undefined;
            const tutorId = user?.role === "tutor" ? user?.id : undefined;

            const counts = await getLessonCountsByMonth(
                year,
                month,
                studentId,
                tutorId
            );

            setMonthLessonCounts(counts);
        } catch (error) {
            console.error("Failed to fetch month lesson counts", error);
            setMonthLessonCounts({});
        } finally {
            setLoadingMonthCounts(false);
        }
    };

    useEffect(() => {
        if (user) {
            refreshLessons();

            // Fetch month lesson counts when in calendar view
            if (viewMode === 'calendar') {
                fetchMonthLessonCounts();
            }
        }
    }, [user, status, page, pageSize, viewMode === 'calendar' ? selectedDate : null]);

    // Fetch month lesson counts when the month changes
    useEffect(() => {
        if (user && viewMode === 'calendar') {
            fetchMonthLessonCounts();
        }
    }, [user, selectedDate.month(), selectedDate.year(), viewMode]);

    useEffect(() => {
        const loadStudents = async () => {
            const result = await fetchStudents(user!.id, "", 0, 100);
            setStudents(result.content || []);
        };

        if (user && user?.role === "tutor") loadStudents();

    }, [user]);

    const columns: GridColDef[] = [
        {
            field: "title",
            headerName: "Lesson",
            flex: 1,
        },
        user?.role === "student"
            ? {
                field: "tutorId",
                headerName: "Teacher",
                flex: 1,
                renderCell: (params: GridRenderCellParams<any>) => {
                    return tutorsMap.get(params.value) || "Unknown";
                },
            }
            : {
                field: "studentId",
                headerName: "Student",
                flex: 1,
                renderCell: (params: GridRenderCellParams<any>) => {
                    const student = getStudentById(params.value);
                    return student ? student.name : "Unknown";
                },
            },
        {
            field: "dateTime",
            headerName: "Date",
            width: 180,
            valueFormatter: (params) => {
                return new Date(params).toLocaleString();
            }
        },
        {
            field: "status",
            headerName: "Status",
            width: 140,
            renderHeader: () => (
                <Box display="flex" alignItems="center">
                    Status
                    <IconButton size="small" onClick={handleStatusFilterClick}>
                        <FilterList fontSize="small" />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={statusFilterOpen}
                        onClose={handleStatusFilterClose}
                    >
                        <MenuItem onClick={() => handleStatusSelect("SCHEDULED")}>Scheduled</MenuItem>
                        <MenuItem onClick={() => handleStatusSelect("COMPLETED")}>Completed</MenuItem>
                        <MenuItem onClick={() => handleStatusSelect("CANCELED")}>Canceled</MenuItem>
                        <MenuItem onClick={() => handleStatusSelect("")}>All</MenuItem>
                    </Menu>
                </Box>
            ),
        },
        {
            field: "homework",
            headerName: "Homework",
            width: 120,
            renderCell: (params) => (
                params.value ? <Chip label="Yes" color="success" /> : <Chip label="No" color="default" />
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 130,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Button
                        size="small"
                        onClick={() =>
                            navigate(`/lessons/${params.row.id}`, {
                                state: { student: getStudentById(params.row.studentId) },
                            })
                        }
                    >
                        View
                    </Button>
                    {user?.role === "tutor" && (
                    <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLessonToDelete(params.row);
                        }}
                    >
                        Delete
                    </Button>)}
                </Box>
            ),
        },
    ];

    // Custom day component to show badges for days with lessons
    const ServerDay = (props: any) => {
        const { day, outsideCurrentMonth, ...other } = props;
        const isSelected = day.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');

        // Format the date to match the API response format (YYYY-MM-DD)
        const dateKey = day.format('YYYY-MM-DD');

        // Check if there are lessons for this day from the month data
        const lessonCount = monthLessonCounts[dateKey] || 0;
        const hasLessons = lessonCount > 0;

        // For the selected day, we can use either the API count or the loaded lessons
        const displayCount = isSelected && lessons.length > 0 ? lessons.length : lessonCount;

        return (
            <Badge
                key={day.toString()}
                overlap="circular"
                badgeContent={hasLessons ? displayCount : undefined}
                color="primary"
            >
                <PickersDay 
                    {...other} 
                    outsideCurrentMonth={outsideCurrentMonth} 
                    day={day}
                    selected={isSelected}
                    sx={{
                        ...(hasLessons && {
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            },
                        }),
                    }}
                />
            </Badge>
        );
    };

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 4 },
                bgcolor: '#fafbfd',
                minHeight: '100vh'
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" fontWeight={600}>
                    Lessons
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Tabs 
                        value={viewMode} 
                        onChange={(_, newValue) => setViewMode(newValue)}
                        sx={{ 
                            minHeight: 40,
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: '3px 3px 0 0'
                            }
                        }}
                    >
                        <Tab 
                            value="list" 
                            label="List" 
                            icon={<ViewList fontSize="small" />} 
                            iconPosition="start"
                            sx={{ minHeight: 40 }}
                        />
                        <Tab 
                            value="calendar" 
                            label="Schedule" 
                            icon={<CalendarMonth fontSize="small" />} 
                            iconPosition="start"
                            sx={{ minHeight: 40 }}
                        />
                    </Tabs>
                </Box>
            </Box>

            {viewMode === 'list' ? (
                <Box sx={{ height: 520, backgroundColor: "#fff" }}>
                    <DataGrid
                        rows={lessons}
                        columns={columns}
                        rowCount={totalLessons}
                        loading={loading}
                        paginationMode="server"
                        paginationModel={{ page, pageSize }}
                        onPaginationModelChange={({ page, pageSize }) => {
                            setPage(page);
                            setPageSize(pageSize);
                        }}
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                    />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', gap: 3 }}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            flex: '0 0 auto', 
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2
                        }}
                    >
                        <DateCalendar 
                            value={selectedDate}
                            onChange={(newDate) => {
                                if (newDate) setSelectedDate(newDate);
                            }}
                            slots={{
                                day: ServerDay
                            }}
                            sx={{
                                '& .MuiPickersCalendarHeader-root': {
                                    marginTop: '8px',
                                    paddingLeft: '16px',
                                    paddingRight: '16px',
                                    marginBottom: '8px'
                                }
                            }}
                        />
                    </Paper>

                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 3, 
                            flex: 1, 
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight={600}>
                                {selectedDate.format('MMMM D, YYYY')}
                            </Typography>
                            {user?.role === "tutor" && (
                                <Button 
                                    variant="contained"
                                    startIcon={<AddIcon />} 
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    Add Lesson
                                </Button>
                            )}
                        </Box>

                        {lessons.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {lessons.map((lesson) => (
                                    <Paper
                                        key={lesson.id}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            border: `1px solid ${theme.palette.divider}`,
                                            '&:hover': {
                                                borderColor: theme.palette.primary.main,
                                                boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                                            },
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => navigate(`/lessons/${lesson.id}`, {
                                            state: { student: getStudentById(lesson.studentId) },
                                        })}
                                    >
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Event fontSize="small" color="primary" />
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {lesson.title}
                                                </Typography>
                                                <Chip 
                                                    label={lesson.status} 
                                                    size="small"
                                                    color={
                                                        lesson.status === 'COMPLETED' ? 'success' : 
                                                        lesson.status === 'CANCELED' ? 'error' : 'primary'
                                                    }
                                                />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {dayjs(lesson.dateTime).format('h:mm A')} - {user?.role === "tutor" 
                                                    ? `Student: ${getStudentById(lesson.studentId)?.name || 'Unknown'}`
                                                    : `Teacher: ${tutorsMap.get(lesson.tutorId) || 'Unknown'}`
                                                }
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Button
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/lessons/${lesson.id}`, {
                                                        state: { student: getStudentById(lesson.studentId) },
                                                    });
                                                }}
                                            >
                                                View
                                            </Button>
                                            {user?.role === "tutor" && (
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLessonToDelete(lesson);
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                py: 8,
                                color: 'text.secondary'
                            }}>
                                <CalendarMonth sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                                <Typography variant="h6" gutterBottom>No lessons scheduled</Typography>
                                <Typography variant="body2">
                                    There are no lessons scheduled for this date.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>
            )}

            <AddLessonModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => {
                    if (user?.id) {
                        refreshLessons();
                        if (viewMode === 'calendar') {
                            fetchMonthLessonCounts();
                        }
                    }
                }}
                students={students}
                initialDate={selectedDate.toISOString()}
            />

            {lessonToDelete && (
                <Dialog open onClose={() => setLessonToDelete(null)}>
                    <DialogTitle>Delete Lesson</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete the lesson with{" "}
                        <strong>{getStudentById(lessonToDelete.studentId)?.name || "Unknown"}</strong>?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setLessonToDelete(null)}>Cancel</Button>
                        <Button
                            onClick={handleDeleteLesson}
                            color="error"
                            variant="contained"
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default LessonsPage;
