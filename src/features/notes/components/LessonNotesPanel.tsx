import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Divider,
    IconButton,
    Paper,
    Tab,
    Tabs,
    Typography
} from '@mui/material';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import type { DailyCall } from '@daily-co/daily-js';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import CurrentLessonNote, { LessonNoteStatus } from './CurrentLessonNote';
import PreviousLessonNotesTab from './PreviousLessonNotesTab';
import type { NotesDataMode, NotesUIMode } from '../utils/modeSelectors';

type NotesTab = 'current' | 'previous';

interface LessonNotesPanelProps {
    lessonId: string;
    lessonTitle?: string;
    studentId?: string;
    teacherId?: string;
    canEdit: boolean;
    uiMode?: NotesUIMode;
    dataMode?: NotesDataMode;
    call?: DailyCall | null;
    senderId?: string;
    initialTab?: NotesTab;
    initialPreviousLessonId?: string;
    onTabChange?: (tab: NotesTab) => void;
    onSelectPreviousLesson?: (lessonId: string | null) => void;
    pollIntervalMs?: number;
    hideContainerChrome?: boolean;
    controlledFormat?: {
        value: LessonNoteFormat;
        onChange: (format: LessonNoteFormat) => void;
    };
    hideFormatControl?: boolean;
    hideStatusChip?: boolean;
    onStatusChange?: (status: LessonNoteStatus) => void;
    activeTabOverride?: NotesTab;
    showPreviousTab?: boolean;
    onClose?: () => void;
}

const tabIndex = (tab: NotesTab) => (tab === 'current' ? 0 : 1);

const LessonNotesPanel: React.FC<LessonNotesPanelProps> = ({
    lessonId,
    lessonTitle,
    studentId,
    teacherId,
    canEdit,
    uiMode = 'docked-side',
    dataMode = 'offline',
    call,
    senderId,
    initialTab = 'current',
    initialPreviousLessonId,
    onTabChange,
    onSelectPreviousLesson,
    pollIntervalMs,
    hideContainerChrome = false,
    controlledFormat,
    hideFormatControl = false,
    hideStatusChip = false,
    onStatusChange,
    activeTabOverride,
    showPreviousTab = true,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<NotesTab>(initialTab);

    useEffect(() => {
        setActiveTab(showPreviousTab ? initialTab : 'current');
    }, [initialTab, showPreviousTab]);

    useEffect(() => {
        if (!activeTabOverride) return;
        if (activeTabOverride !== activeTab) {
            setActiveTab(activeTabOverride);
        }
    }, [activeTabOverride, activeTab]);

    useEffect(() => {
        if (!showPreviousTab) {
            setActiveTab('current');
        }
    }, [showPreviousTab]);

    const handleTabChange = (_event: React.SyntheticEvent, value: number) => {
        const nextTab: NotesTab = value === 0 ? 'current' : 'previous';
        if (!showPreviousTab && nextTab !== 'current') {
            return;
        }
        setActiveTab(nextTab);
        onTabChange?.(nextTab);
    };

    const panelContent = useMemo(() => {
        const showTabs = showPreviousTab;
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {showTabs && (
                    <Tabs
                        value={tabIndex(activeTab)}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        aria-label="Lesson notes tabs"
                        sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}
                    >
                        <Tab label="Current" id="lesson-notes-tab-current" aria-controls="lesson-notes-panel-current" />
                        {showPreviousTab && (
                            <Tab label="Previous" id="lesson-notes-tab-previous" aria-controls="lesson-notes-panel-previous" />
                        )}
                    </Tabs>
                )}
                <Box
                    role="tabpanel"
                    hidden={activeTab !== 'current'}
                    id="lesson-notes-panel-current"
                    aria-labelledby="lesson-notes-tab-current"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        display: activeTab === 'current' ? 'flex' : 'none',
                        width: '100%'
                    }}
                >
                    <CurrentLessonNote
                        lessonId={lessonId}
                        lessonTitle={lessonTitle}
                        isActive={activeTab === 'current'}
                        dataMode={dataMode}
                        uiMode={uiMode}
                        call={call}
                        senderId={senderId}
                        canEdit={canEdit}
                        pollIntervalMs={pollIntervalMs}
                        controlledFormat={controlledFormat}
                        hideFormatControl={hideFormatControl}
                        hideStatusChip={hideStatusChip}
                        onStatusChange={onStatusChange}
                        hideHeader={hideContainerChrome}
                    />
                </Box>
                {showPreviousTab && (
                    <Box
                        role="tabpanel"
                        hidden={activeTab !== 'previous'}
                        id="lesson-notes-panel-previous"
                        aria-labelledby="lesson-notes-tab-previous"
                        sx={{ flex: 1, overflow: 'hidden', display: activeTab === 'previous' ? 'flex' : 'none', p: 2 }}
                    >
                        <PreviousLessonNotesTab
                            studentId={studentId}
                            teacherId={teacherId}
                            isActive={activeTab === 'previous'}
                            initialLessonId={initialPreviousLessonId}
                            onSelectLesson={onSelectPreviousLesson}
                        />
                    </Box>
                )}
            </Box>
        );
    }, [
        activeTab,
        lessonId,
        lessonTitle,
        canEdit,
        pollIntervalMs,
        studentId,
        teacherId,
        initialPreviousLessonId,
        onSelectPreviousLesson,
        controlledFormat,
        hideFormatControl,
        hideStatusChip,
        onStatusChange,
        showPreviousTab,
        dataMode,
        uiMode,
        call,
        senderId
    ]);

    const containerStyles = useMemo(() => {
        switch (uiMode) {
            case 'docked-bottom':
                return {
                    borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
                    width: '100%',
                    minHeight: '32vh',
                    maxHeight: '45vh',
                    overflow: 'hidden'
                };
            case 'docked-side':
                return {
                    width: '100%',
                    maxWidth: 480,
                    borderLeft: (theme: any) => `1px solid ${theme.palette.divider}`
                };
            case 'floating':
            default:
                return {
                    width: '100%'
                };
        }
    }, [uiMode]);

    if (hideContainerChrome) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    flex: 1,
                    '& > *': {
                        flex: 1,
                        minHeight: 0,
                        width: '100%'
                    }
                }}
            >
                {panelContent}
            </Box>
        );
    }

    return (
        <Paper
            elevation={1}
            sx={{
                height: '100%',
                minHeight: 0,
                borderRadius: 0,
                display: 'flex',
                flexDirection: 'column',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
                flex: 1,
                ...containerStyles
            }}
        >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NoteAltOutlinedIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle1">Lesson Notes</Typography>
                </Box>
                {onClose ? (
                    <IconButton size="small" aria-label="Close notes panel" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>
            <Divider />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {panelContent}
            </Box>
        </Paper>
    );
};

export default LessonNotesPanel;
