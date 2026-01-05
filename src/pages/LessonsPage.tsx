import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Box,
    Typography,
    Button,
    MenuItem,
    IconButton,
    Menu,
    useTheme,
    alpha,
    ToggleButtonGroup,
    ToggleButton,
    Stack,
    useMediaQuery
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
    fetchStudents,
    getLessons,
    fetchUserById, updateLesson, fetchMyTutorLessons, getTeacherByStudentId,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Student } from "./MyStudentsPage";
import { useNavigate } from "react-router-dom";
import {
    FilterList,
    ArrowBackIos,
    ArrowForwardIos,
} from "@mui/icons-material";
import dayjs from "dayjs";
import LessonSidePanel from "../components/LessonSidePanel";
import TeacherCalendarDialog from "../components/TeacherCalendarDialog";

// Import custom calendar styles
import "../styles/calendar.css";

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, {DateClickArg} from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';

const DAY_COLUMN_MIN_WIDTH = 136;
const TIME_COLUMN_WIDTH = 64;

// Session storage keys for persisting calendar state
const CALENDAR_DATE_KEY = 'lessons_calendar_date';
const CALENDAR_VIEW_KEY = 'lessons_calendar_view';

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
    const [showTeacherCal, setShowTeacherCal] = useState(false);
    const [busyEvents, setBusyEvents] = useState<EventInput[]>([]);
    const theme = useTheme();
    const isCompactLayout = useMediaQuery(theme.breakpoints.down('lg'));
    const [calendarView, setCalendarView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>(() => {
        // Restore view from session storage, or use default based on screen size
        const savedView = sessionStorage.getItem(CALENDAR_VIEW_KEY) as 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | null;
        if (savedView && ['timeGridDay', 'timeGridWeek', 'dayGridMonth'].includes(savedView)) {
            return savedView;
        }
        return isCompactLayout ? 'timeGridDay' : 'timeGridWeek';
    });
    // Auto-scroll to the current time and center it in the view when calendarView changes
    useEffect(() => {
        const timeout = setTimeout(() => {
            const scroller = calendarRef.current?.el?.querySelector('.fc-scroller-harness .fc-scroller') as HTMLElement;
            const nowIndicator = calendarRef.current?.el?.querySelector('.fc-now-indicator-line') as HTMLElement;

            if (scroller && nowIndicator) {
                const scrollerTop = scroller.getBoundingClientRect().top;
                const indicatorTop = nowIndicator.getBoundingClientRect().top;
                const offset = indicatorTop - scrollerTop;
                scroller.scrollTop = offset - scroller.clientHeight / 2.2;
            }
        }, 800); // Wait for FullCalendar layout to stabilize

        return () => clearTimeout(timeout);
    }, [calendarView]);
    useEffect(() => {
        if (!isCompactLayout) return;
        const api = calendarRef.current?.getApi();
        if (!api || api.view.type === 'timeGridDay') return;
        setCalendarView('timeGridDay');
        api.changeView('timeGridDay');
    }, [isCompactLayout]);

    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(() => {
        // Restore date from session storage, or use current date
        const savedDate = sessionStorage.getItem(CALENDAR_DATE_KEY);
        if (savedDate) {
            const parsed = dayjs(savedDate);
            if (parsed.isValid()) {
                return parsed;
            }
        }
        return dayjs();
    });
    const calendarRef = useRef<any>(null);

    // Persist calendar date and view to session storage
    useEffect(() => {
        sessionStorage.setItem(CALENDAR_DATE_KEY, selectedDate.toISOString());
    }, [selectedDate]);

    useEffect(() => {
        sessionStorage.setItem(CALENDAR_VIEW_KEY, calendarView);
    }, [calendarView]);
    const calendarViewportRef = useRef<HTMLDivElement | null>(null);
    const [calendarViewportHeight, setCalendarViewportHeight] = useState<number | null>(null);
    const suppressNextAutoSelect = useRef(false);
    const updateCalendarViewportHeight = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!calendarViewportRef.current) return;
        const rect = calendarViewportRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const paddingBottom = 16; // match bottom page padding
        const available = viewportHeight - rect.top - paddingBottom;
        setCalendarViewportHeight(Math.max(available, 360));
    }, []);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        updateCalendarViewportHeight();
        window.addEventListener('resize', updateCalendarViewportHeight);
        return () => {
            window.removeEventListener('resize', updateCalendarViewportHeight);
        };
    }, [updateCalendarViewportHeight]);
    useEffect(() => {
        updateCalendarViewportHeight();
    }, [calendarView, isCompactLayout, updateCalendarViewportHeight]);

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

    const loadBusySlots = async (start?: string, end?: string) => {
        const teacher = await getTeacherByStudentId(user?.id as string);
        const tutorId = teacher.id;
        if (!tutorId) return;

        let rangeStart = start;
        let rangeEnd = end;

        if (!rangeStart || !rangeEnd) {
            const calendarApi = calendarRef.current?.getApi();
            rangeStart = calendarApi?.view.activeStart.toISOString();
            rangeEnd = calendarApi?.view.activeEnd.toISOString();
        }

        if (!rangeStart || !rangeEnd) return;

        const busy = await fetchMyTutorLessons(tutorId, rangeStart, rangeEnd);
        const events = busy.map((l: any) => ({
            id: l.id,
            start: l.dateTime,
            end:   dayjs(l.dateTime).add(l.duration, 'minute').toISOString(),
            backgroundColor: alpha(theme.palette.grey[500], 0.3),
            borderColor: theme.palette.grey[500],
        }));
        setBusyEvents(events);
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
                case 'MISSED':
                    backgroundColor = alpha(theme.palette.warning.main, 0.7);
                    borderColor = theme.palette.warning.main;
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

    const handleRangeChange = async (start: Date, end: Date) => {
        await loadBusySlots(start.toISOString(), end.toISOString());
    };

    useEffect(() => {
        if (user) {
            refreshLessons();
        }
    }, [user, status, calendarView, selectedDate]);

    useEffect(() => {
        if (showTeacherCal) loadBusySlots();
    }, [showTeacherCal]);

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
    const compactButtonSx = {
        height: 32,
        minHeight: 32,
        borderRadius: 1,
        px: 1
    };
    const dayColumnCount = calendarView === 'timeGridWeek' || calendarView === 'dayGridMonth' ? 7 : 1;
    const calendarMinWidth = (calendarView === 'dayGridMonth' ? 0 : TIME_COLUMN_WIDTH) + (dayColumnCount * DAY_COLUMN_MIN_WIDTH);
    const renderEventContent = React.useCallback(
        (eventInfo: EventContentArg) => (
            <Box
                component="span"
                sx={{
                    display: 'block',
                    backgroundColor: eventInfo.backgroundColor || theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    fontSize: 12,
                    lineHeight: 1.2,
                    height: '100%',
                    wordBreak: 'break-word'
                }}
            >
                {eventInfo.timeText && (
                    <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                        {eventInfo.timeText}
                    </Box>
                )}
                <Box component="span" sx={{ display: 'block' }}>
                    {eventInfo.event.title}
                </Box>
            </Box>
        ),
        [theme]
    );

    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                width: '100%',
                p: { xs: 1.5, sm: 2.5 },
                bgcolor: '#fafbfd',
                overflow: 'hidden'
            }}
        >
            <Stack spacing={1} flexShrink={0}>
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={0.75}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                        <IconButton onClick={handlePrevClick} size="small" sx={{ width: 32, height: 32 }}>
                            <ArrowBackIos fontSize="small" />
                        </IconButton>
                        <IconButton onClick={handleNextClick} size="small" sx={{ width: 32, height: 32 }}>
                            <ArrowForwardIos fontSize="small" />
                        </IconButton>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleTodayClick}
                            sx={compactButtonSx}
                        >
                            Today
                        </Button>
                        <ToggleButtonGroup
                            value={calendarView}
                            exclusive
                            onChange={handleViewChange}
                            aria-label="calendar view"
                            size="small"
                            sx={{
                                height: 32,
                                borderRadius: 4,
                                overflow: 'hidden',
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                                '& .MuiToggleButton-root': {
                                    px: 0.75,
                                    height: 32,
                                    borderRadius: 0,
                                    fontSize: '0.78rem',
                                    textTransform: 'none',
                                    letterSpacing: 0.2,
                                    borderColor: alpha(theme.palette.text.primary, 0.15)
                                },
                                '& .MuiToggleButtonGroup-grouped:not(:last-of-type)': {
                                    borderRight: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`
                                },
                                '& .MuiToggleButtonGroup-grouped.Mui-selected': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main
                                }
                            }}
                        >
                            <ToggleButton value="timeGridDay" aria-label="day view">
                                Day
                            </ToggleButton>
                            <ToggleButton value="timeGridWeek" aria-label="week view">
                                Week
                            </ToggleButton>
                            <ToggleButton value="dayGridMonth" aria-label="month view">
                                Month
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>

                        <Typography
                            variant="subtitle2"
                            fontWeight={500}
                            sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            textAlign: { xs: 'left', lg: 'right' }
                        }}
                    >
                        {getCurrentViewTitle()}
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', lg: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', lg: 'center' }}
                        spacing={0.75}
                    >
                        <Stack
                            direction="row"
                            spacing={0.75}
                            flexWrap="wrap"
                            justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
                        >
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FilterList />}
                                onClick={handleStatusFilterClick}
                                sx={compactButtonSx}
                            >
                                Filter
                            </Button>
                            {user?.role === "tutor" && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsModalOpen(true)}
                                    sx={compactButtonSx}
                                >
                                    Add Lesson
                                </Button>
                            )}
                            {user?.role === 'student' && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setShowTeacherCal(true)}
                                    sx={compactButtonSx}
                                >
                                    Show teacher calendar
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>

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

            <Box
                ref={calendarViewportRef}
                sx={{
                    flex: calendarViewportHeight ? '0 0 auto' : 1,
                    minHeight: 0,
                    mt: 1.5,
                    width: '100%',
                    overflow: 'hidden',
                    height: calendarViewportHeight ? `${calendarViewportHeight}px` : 'auto',
                    maxHeight: calendarViewportHeight ? `${calendarViewportHeight}px` : undefined,
                    transition: 'height 0.25s ease, max-height 0.25s ease'
                }}
            >
                <Box
                    sx={{
                        height: '100%',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.paper,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflow: 'hidden'
                            }}
                        >
                            <Box
                                sx={{
                                    height: '100%',
                                    width: '100%',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                <Box
                                    sx={{
                                        minWidth: `${calendarMinWidth}px`,
                                        height: '100%',
                                        '& .fc': {
                                            minHeight: '100%'
                                        },
                                        '& .fc-view-harness': {
                                            minHeight: '100%'
                                        },
                                        '& .fc-scrollgrid': {
                                            minWidth: `${calendarMinWidth}px`
                                        },
                                        '& .fc-scroller': {
                                            overflowY: 'auto !important'
                                        },
                                        '& .fc-scroller-harness': {
                                            height: '100% !important'
                                        },
                                        '& .fc-timegrid-axis': {
                                            width: `${TIME_COLUMN_WIDTH}px`,
                                            minWidth: `${TIME_COLUMN_WIDTH}px`,
                                            maxWidth: `${TIME_COLUMN_WIDTH}px`
                                        },
                                        '& .fc-timegrid-col': {
                                            minWidth: `${DAY_COLUMN_MIN_WIDTH}px`
                                        },
                                        '& .fc-timegrid-slot': {
                                            height: { xs: '36px', md: '40px' },
                                            minHeight: { xs: '36px', md: '40px' }
                                        },
                                        '& .fc-timegrid-slot-label': {
                                            height: { xs: '36px', md: '40px' },
                                            minHeight: { xs: '36px', md: '40px' }
                                        },
                                        '& .fc-timegrid-slot-label-cushion': {
                                            fontSize: { xs: '0.75rem', md: '0.85rem' },
                                            paddingTop: 0
                                        },
                                        '& .fc-daygrid-day': {
                                            minWidth: `${DAY_COLUMN_MIN_WIDTH}px`
                                        },
                                        '& .fc-daygrid-body table': {
                                            minWidth: `${calendarMinWidth}px`
                                        },
                                        '& .fc-timegrid-body > table': {
                                            minWidth: `${calendarMinWidth}px`
                                        },
                                        '& .fc-event': {
                                            backgroundColor: 'transparent !important',
                                            border: 'none !important',
                                            padding: 0
                                        }
                                    }}
                                >
                                    <FullCalendar
                                        ref={calendarRef}
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                        initialView={calendarView}
                                        initialDate={selectedDate.toDate()}
                                        headerToolbar={false} // We're creating our own header
                                        firstDay={1}
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
                                        dayHeaderFormat={{ weekday: 'short', day: 'numeric', omitCommas: true }}
                                        eventTimeFormat={{
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        }}
                                        slotLabelFormat={{
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        }}
                                        eventContent={renderEventContent}
                                        dayCellDidMount={(info) => {
                                            // Highlight today's date
                                            if (info.isToday) {
                                                info.el.style.backgroundColor = alpha(theme.palette.primary.main, 0.05);
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
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

            <TeacherCalendarDialog
                open={showTeacherCal}
                onClose={() => setShowTeacherCal(false)}
                events={busyEvents}
                onRangeChange={handleRangeChange}
            />
        </Box>
    );
};

export default LessonsPage;
