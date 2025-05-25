import React, { useEffect, useState, useRef } from "react";
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
    Paper,
    useTheme,
    alpha,
    Tooltip,
    Avatar,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
    fetchStudents,
    deleteLesson,
    getLessons,
    fetchUserById, updateLesson,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Student } from "./MyStudentsPage";
import { useNavigate } from "react-router-dom";
import { 
    FilterList, 
    ViewDay, 
    ViewWeek, 
    CalendarMonth, 
    ArrowBackIos,
    ArrowForwardIos,
} from "@mui/icons-material";
import dayjs from "dayjs";
import LessonSidePanel from "../components/LessonSidePanel";

// Import custom calendar styles
import "../styles/calendar.css";

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, {DateClickArg} from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';

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
    // Set default calendar view based on screen size (xs: day, sm+: week)
    const getDefaultCalendarView = () => {
        if (window && window.matchMedia && window.matchMedia('(max-width:600px)').matches) {
            return 'timeGridDay';
        }
        return 'timeGridWeek';
    };
    const [calendarView, setCalendarView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>(getDefaultCalendarView());
    // Force FullCalendar to re-render after layout stabilizes (fixes blank calendar on mobile with scroll container)
    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.updateSize();
        }
    }, [calendarView]);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
    const theme = useTheme();
    const calendarRef = useRef<any>(null);
    const suppressNextAutoSelect = useRef(false);

    const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleStatusFilterClose = () => {
        setAnchorEl(null);
    };

    const handleStatusSelect = (value: string) => {
        setStatus(value);
        handleStatusFilterClose();
    };

    const refreshLessons = async () => {
        try {
            const studentId = user?.role === "student" ? user?.id : undefined;
            const tutorId = user?.role === "tutor" ? user?.id : undefined;

            // For calendar view, we don't need to filter by date as FullCalendar will handle the date range
            const result = await getLessons(studentId as string, tutorId as string, status);

            const lessons = result.content;
            setLessons(lessons);

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
        }
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete || !user) return;
        try {
            setDeleting(true);
            await deleteLesson(lessonToDelete.id);
            await refreshLessons();
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

    // Convert lessons to FullCalendar events
    const lessonsToEvents = (): EventInput[] => {
        return lessons.map(lesson => {
            const student = getStudentById(lesson.studentId);
            const tutorName = tutorsMap.get(lesson.tutorId) || "Unknown";
            const displayName = user?.role === "tutor" ? student?.name || "Unknown" : tutorName;

            // Calculate end time based on start time and duration
            const startTime = dayjs(lesson.dateTime);
            const endTime = startTime.add(lesson.duration, 'minute');

            // Determine color based on status
            let backgroundColor;
            let borderColor;

            switch(lesson.status) {
                case 'COMPLETED':
                    backgroundColor = alpha(theme.palette.success.main, 0.7);
                    borderColor = theme.palette.success.main;
                    break;
                case 'CANCELED':
                    backgroundColor = alpha(theme.palette.error.main, 0.7);
                    borderColor = theme.palette.error.main;
                    break;
                default:
                    backgroundColor = alpha(theme.palette.primary.main, 0.7);
                    borderColor = theme.palette.primary.main;
            }

            return {
                id: lesson.id,
                title: `${lesson.title} - ${displayName}`,
                start: lesson.dateTime,
                end: endTime.toISOString(),
                backgroundColor,
                borderColor,
                extendedProps: {
                    lesson: lesson,
                    student: student,
                    status: lesson.status
                }
            };
        });
    };

    // Handle date selection in calendar
    const handleDateSelect = (selectInfo: DateSelectArg) => {
        suppressNextAutoSelect.current = false;
        // Only open the side‑panel when the user actually clicks or drags on the calendar.
        // Programmatic navigation (e.g., hitting “Today”) can trigger a synthetic selection
        // that doesn’t include a MouseEvent, which used to open the panel unintentionally.
        if (user?.role === "tutor" && selectInfo.jsEvent && !suppressNextAutoSelect.current) {
            setSelectedDate(dayjs(selectInfo.start));
            setIsModalOpen(true);
        }
    };

    // Handle event click in calendar
    const handleEventClick = (clickInfo: EventClickArg) => {
        const lesson = clickInfo.event.extendedProps.lesson;
        const student = getStudentById(lesson.studentId);

        // Navigate to the lesson detail page
        navigate(`/lessons/${lesson.id}`, {
            state: { student: student }
        });
    };

    // Handle event click in calendar
    const handleDayClick = (info: DateClickArg) => {
        // When a day is clicked in month view, navigate to day view for that date
        if (calendarRef.current && calendarView === 'dayGridMonth') {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.unselect(); // clear any selection to prevent auto-opening
            suppressNextAutoSelect.current = true;
            calendarApi.changeView('timeGridDay', info.dateStr);
            setCalendarView('timeGridDay');
            setSelectedDate(dayjs(info.date));
        }
    };

    // Handle calendar view change
    const handleViewChange = (
        event: React.MouseEvent<HTMLElement>,
        newView: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | null
    ) => {
        if (newView) {
            setCalendarView(newView);
            if (calendarRef.current) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.changeView(newView);
            }
        }
    };

    // Handle today button click
    const handleTodayClick = () => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.today();
            calendarApi.unselect(); // clear synthetic selection to avoid opening sidebar
            setSelectedDate(dayjs());
        }
    };

    // Handle previous button click
    const handlePrevClick = () => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.prev();
            calendarApi.unselect(); // ensure no stale selection persists

            // Update selected date based on the current view
            const currentDate = dayjs(calendarApi.getDate());
            setSelectedDate(currentDate);
        }
    };

    // Handle next button click
    const handleNextClick = () => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.next();
            calendarApi.unselect(); // ensure no stale selection persists

            // Update selected date based on the current view
            const currentDate = dayjs(calendarApi.getDate());
            setSelectedDate(currentDate);
        }
    };

    useEffect(() => {
        if (user) {
            refreshLessons();
        }
    }, [user, status]);

    useEffect(() => {
        const loadStudents = async () => {
            const result = await fetchStudents(user!.id, "", 0, 100);
            setStudents(result.content || []);
        };

        if (user && user?.role === "tutor") loadStudents();

    }, [user]);

    // Get the current view title (e.g., "June 2023" or "June 5-11, 2023")
    const getCurrentViewTitle = () => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            return calendarApi.view.title;
        }
        return "";
    };

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: '#fafbfd',
                minHeight: '100dvh',
                width: '100%',
                overflowX: 'hidden'
            }}
        >
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", rowGap: 2, columnGap: 3, mb: 3 }}>
                <Typography variant="h5" fontWeight={600}>
                    Lessons
                </Typography>

                {/* Calendar Controls */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        rowGap: 1.5,
                        columnGap: 2,
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                        flexDirection: 'row'
                    }}
                >
                    {/* Status Filter */}
                    <Tooltip title="Filter by status">
                        <IconButton onClick={handleStatusFilterClick}>
                            <FilterList />
                        </IconButton>
                    </Tooltip>
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

                    {/* View Toggle */}
                    <ToggleButtonGroup
                        value={calendarView}
                        exclusive
                        onChange={handleViewChange}
                        aria-label="calendar view"
                        size="small"
                    >
                        <ToggleButton value="timeGridDay" aria-label="day view">
                            <ViewDay fontSize="small" />
                            <Typography sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}>Day</Typography>
                        </ToggleButton>
                        <ToggleButton value="timeGridWeek" aria-label="week view">
                            <ViewWeek fontSize="small" />
                            <Typography sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}>Week</Typography>
                        </ToggleButton>
                        <ToggleButton value="dayGridMonth" aria-label="month view">
                            <CalendarMonth fontSize="small" />
                            <Typography sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}>Month</Typography>
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Add Lesson Button (for tutors only) */}
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
            </Box>

            {/* Calendar Navigation */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                backgroundColor: theme.palette.background.paper,
                borderRadius: 2,
                p: 1.5,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={handlePrevClick} size="small">
                        <ArrowBackIos fontSize="small" />
                    </IconButton>
                    <IconButton onClick={handleNextClick} size="small">
                        <ArrowForwardIos fontSize="small" />
                    </IconButton>
                    <Button
                        variant="text"
                        onClick={handleTodayClick}
                        sx={{
                            minWidth: 'auto',
                            fontWeight: 500,
                            textTransform: 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        Today
                    </Button>
                </Box>

                <Typography
                    variant="h6"
                    fontWeight={500}
                    sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: { xs: '60vw', sm: '100%' }
                    }}
                >
                    {getCurrentViewTitle()}
                </Typography>

                <Box sx={{ width: 100 }}></Box> {/* Spacer for alignment */}
            </Box>

            {/* Calendar */}
            {/* Calendar container with horizontal scroll on mobile */}
            <Box
                sx={{
                    overflowX: { xs: 'auto', sm: 'visible' },
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    width: '100%',
                    // Paper wrapper style
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    p: 0,
                    // Height for calendar
                    height: { xs: '70dvh', md: 'calc(100vh - 240px)' },
                    minHeight: 400,
                    position: 'relative',
                    zIndex: 0,
                }}
            >
                <Box sx={{
                    minWidth: { xs: 700, sm: 'unset' }, // allow horizontal scroll on small screens
                    position: 'relative',
                    zIndex: 1,
                    height: '100%',
                }}>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView={getDefaultCalendarView()}
                        headerToolbar={false} // We're creating our own header
                        events={lessonsToEvents()}
                        selectable={user?.role === "tutor"}
                        select={handleDateSelect}
                        eventClick={handleEventClick}
                        dateClick={handleDayClick}
                        height="100%"
                        nowIndicator={true}
                        dayMaxEvents={true}
                        allDaySlot={false}
                        slotMinTime="08:00:00"
                        slotMaxTime="23:00:00"
                        expandRows={true}
                        stickyHeaderDates={true}
                        editable={user?.role === "tutor"} // Enable drag-and-drop for tutors
                        eventDrop={(info) => {
                            // Handle event drop (reschedule)
                            const lesson = info.event.extendedProps.lesson;
                            const newStart = info.event.start;
                            const newEnd = info.event.end;

                            if (newStart && newEnd) {
                                // Calculate new duration in minutes
                                const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));

                                // Show loading indicator
                                const originalElement = info.el;
                                originalElement.style.opacity = '0.7';

                                // Update lesson in backend
                                updateLesson(lesson.id, {
                                    dateTime: newStart.toISOString(),
                                    duration: newDuration
                                })
                                .then(() => {
                                    // Success - show confirmation
                                    originalElement.style.opacity = '1';
                                    originalElement.classList.add('status-change');
                                    setTimeout(() => {
                                        originalElement.classList.remove('status-change');
                                    }, 500);

                                    // Refresh lessons to get updated data
                                    refreshLessons();
                                })
                                .catch((error) => {
                                    console.error("Failed to update lesson:", error);
                                    info.revert(); // Revert the drag if update fails
                                });
                            }
                        }}
                        dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }}
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            meridiem: false
                        }}
                        slotLabelFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }}
                        eventContent={(eventInfo) => {
                            const lesson = eventInfo.event.extendedProps.lesson;
                            const student = eventInfo.event.extendedProps.student;
                            const status = eventInfo.event.extendedProps.status;

                            // Get student initials for avatar
                            const getInitials = (name: string) => {
                                return name
                                    .split(' ')
                                    .map(part => part[0])
                                    .join('')
                                    .toUpperCase()
                                    .substring(0, 2);
                            };

                            const studentName = student?.name || 'Unknown';
                            const studentInitials = getInitials(studentName);

                            // Generate a consistent color based on student name
                            const getAvatarColor = (name: string) => {
                                const colors = [
                                    '#2573ff', '#00d7c2', '#f6c344', '#ff6b6b',
                                    '#a394f0', '#4ecdc4', '#ff9f1c', '#8675a9'
                                ];

                                let hash = 0;
                                for (let i = 0; i < name.length; i++) {
                                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                }

                                return colors[Math.abs(hash) % colors.length];
                            };

                            const avatarColor = getAvatarColor(studentName);

                            // Add status-specific class for styling
                            const statusClass = `status-${status.toLowerCase()}`;

                            return (
                                <Tooltip
                                    title={
                                        <Box sx={{ p: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {lesson.title}
                                            </Typography>
                                            <Typography variant="body2">
                                                {eventInfo.timeText} ({lesson.duration} min)
                                            </Typography>
                                            <Typography variant="body2">
                                                Status: {status}
                                            </Typography>
                                            {lesson.location && (
                                                <Typography variant="body2">
                                                    Location: {lesson.location}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                    arrow
                                    placement="top"
                                >
                                    <Box
                                        className={`fc-event ${statusClass}`}
                                        sx={{
                                            p: 0.5,
                                            height: '100%',
                                            overflow: 'hidden',
                                            fontSize: '0.8rem',
                                            lineHeight: 1.3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            backgroundColor: '#E6F0FF',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            '&:hover': {
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                                transform: 'translateY(-2px)'
                                            },
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        {/* Time (hide on mobile) */}
                                        <Box
                                            sx={{
                                                display: { xs: 'none', sm: 'block' },
                                                fontWeight: 500,
                                                mb: 0.5,
                                                fontSize: '13px',
                                                color: theme.palette.text.secondary,
                                                pointerEvents: 'none'
                                            }}
                                        >
                                            {eventInfo.timeText}
                                        </Box>

                                        {/* Student name with avatar/initials */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            pointerEvents: 'none'
                                        }}>
                                            <Avatar
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: '12px',
                                                    bgcolor: avatarColor,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {studentInitials}
                                            </Avatar>
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: { xs: '12px', sm: '14px' },
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {studentName}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Tooltip>
                            );
                        }}
                        dayCellDidMount={(info) => {
                            // Highlight today's date
                            if (info.isToday) {
                                info.el.style.backgroundColor = alpha(theme.palette.primary.main, 0.05);
                            }
                        }}
                    />
                </Box>
            </Box>

            {/* Add Lesson Side Panel */}
            <LessonSidePanel
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => {
                    if (user?.id) {
                        refreshLessons();
                    }
                }}
                students={students}
                initialDate={selectedDate.toISOString()}
            />

            {/* Delete Confirmation Dialog */}
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
