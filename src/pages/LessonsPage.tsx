import React, { useEffect, useState, useRef } from "react";
import {
    Box,
    Typography,
    Button,
    MenuItem,
    IconButton,
    Menu,
    useTheme,
    alpha,
    Tooltip,
    ToggleButtonGroup,
    ToggleButton
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
    fetchStudents,
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
            const now = new Date();
            calendarApi.scrollToTime(now.toTimeString().substring(0, 8));
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
            const calendarApi = calendarRef.current?.getApi();
            const view = calendarApi?.view;
            const startDate = view?.activeStart?.toISOString();
            const endDate = view?.activeEnd?.toISOString();

            const studentId = user?.role === "student" ? user?.id : undefined;
            const tutorId = user?.role === "tutor" ? user?.id : undefined;

            if (!startDate || !endDate) {
                console.warn("Calendar view dates not available");
                return;
            }

            const lessons = await getLessons(studentId as string, tutorId as string, status, startDate, endDate);
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
            const displayName =  user?.role === "tutor" ? lesson.title :`Lesson with ${tutorName}`;

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
                title: `${displayName}`,
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
    }, [user, status, calendarView, selectedDate]);

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
                    minWidth: { xs: '100%', sm: 'unset' },
                    overflowX: { xs: 'auto', sm: 'visible' },
                    WebkitOverflowScrolling: 'touch',
                    width: '100%',
                    // Paper wrapper style
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    p: 0,
                    // Height for calendar
                    height: { xs: 'calc(100dvh - 280px)', md: 'calc(100vh - 240px)' },
                    minHeight: 400,
                    position: 'relative',
                    zIndex: 0,
                }}
            >
                <Box sx={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView={getDefaultCalendarView()}
                        headerToolbar={false} // We're creating our own header
                        events={lessonsToEvents()}
                        selectable={user?.role === "tutor"}
                        select={handleDateSelect}
                        selectOverlap={false}
                        eventClick={handleEventClick}
                        dateClick={handleDayClick}
                        height="100%"
                        nowIndicator={true}
                        dayMaxEvents={true}
                        allDaySlot={false}
                        slotMinTime="08:00:00"
                        slotMaxTime="23:00:00"
                        slotDuration="01:00:00"
                        slotLabelInterval="01:00:00"
                        snapDuration="00:15:00"
                        expandRows={true}
                        stickyHeaderDates={true}
                        editable={user?.role === "tutor"}
                        datesSet={() => {
                            refreshLessons();
                        }}
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
        </Box>
    );
};

export default LessonsPage;
