import React, { useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, IconButton, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {EventInput} from "@fullcalendar/core";

const TeacherCalendarDialog = ({
                                   open, onClose, events, onRangeChange,
                               }: {
    open: boolean;
    onClose: () => void;
    events: EventInput[];
    onRangeChange: (start: Date, end: Date) => void;
}) => {
    const calendarRef = useRef<any>(null);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, p: 2 }}>
                Tutor Calendar
                <Button onClick={() => calendarRef.current?.getApi().prev()} size="small" sx={{ ml: 2 }}>
                    &lt;
                </Button>
                <Button onClick={() => calendarRef.current?.getApi().today()} size="small" sx={{ mx: 1 }}>
                    Today
                </Button>
                <Button onClick={() => calendarRef.current?.getApi().next()} size="small">
                    &gt;
                </Button>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    height="auto"
                    contentHeight="auto"
                    initialView="timeGridWeek"
                    headerToolbar={false}
                    events={events}
                    allDaySlot={false}
                    slotMinTime="08:00:00"
                    slotMaxTime="23:00:00"
                    slotDuration="01:00"
                    eventDisplay="block"
                    eventContent={({ event }) => {
                        const start = event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        const end = event.end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        return (
                            <div style={{ fontSize: '0.65rem', fontWeight: 400, padding: '1px 2px' }}>
                                {start} - {end}
                            </div>
                        );
                    }}
                    selectable={false}
                    editable={false}
                    stickyHeaderDates={true}
                    dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                    datesSet={({ start, end }) => onRangeChange(start, end)}
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
                    expandRows={true}
                    dayMaxEventRows={3}
                />
            </DialogContent>
        </Dialog>
    );
};

export default TeacherCalendarDialog;
