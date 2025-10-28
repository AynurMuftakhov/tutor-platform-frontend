import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Divider,
    Drawer,
    Paper,
    Tab,
    Tabs,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import CurrentLessonNote, { LessonNoteStatus } from './CurrentLessonNote';
import PreviousLessonNotesTab from './PreviousLessonNotesTab';

type NotesTab = 'current' | 'previous';

interface LessonNotesPanelProps {
    lessonId: string;
    lessonTitle?: string;
    studentId?: string;
    teacherId?: string;
    canEdit: boolean;
    initialTab?: NotesTab;
    initialPreviousLessonId?: string;
    onTabChange?: (tab: NotesTab) => void;
    onSelectPreviousLesson?: (lessonId: string | null) => void;
    pollIntervalMs?: number;
    incomingSoftSync?: { content: string; format: LessonNoteFormat; updatedAt?: string };
    onBroadcastSoftSync?: (payload: { content: string; format: LessonNoteFormat }) => void;
    forceInline?: boolean;
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
    mobileOpen?: boolean;
    onMobileOpen?: () => void;
    onMobileClose?: () => void;
}

const tabIndex = (tab: NotesTab) => (tab === 'current' ? 0 : 1);

const LessonNotesPanel: React.FC<LessonNotesPanelProps> = ({
    lessonId,
    lessonTitle,
    studentId,
    teacherId,
    canEdit,
    initialTab = 'current',
    initialPreviousLessonId,
    onTabChange,
    onSelectPreviousLesson,
    pollIntervalMs,
    incomingSoftSync,
    onBroadcastSoftSync,
    forceInline = false,
    hideContainerChrome = false,
    controlledFormat,
    hideFormatControl = false,
    hideStatusChip = false,
    onStatusChange,
    activeTabOverride,
    showPreviousTab = true,
    mobileOpen: mobileOpenProp,
    onMobileOpen,
    onMobileClose
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const useSheet = !forceInline && isMobile;
    const [activeTab, setActiveTab] = useState<NotesTab>(initialTab);
    const isMobileControlled = typeof mobileOpenProp === 'boolean';
    const [internalMobileOpen, setInternalMobileOpen] = useState<boolean>(() => (useSheet ? initialTab !== 'current' : true));
    const mobileOpen = isMobileControlled ? (mobileOpenProp as boolean) : internalMobileOpen;

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

    useEffect(() => {
        if (!useSheet && !isMobileControlled) {
            setInternalMobileOpen(true);
        }
    }, [useSheet, isMobileControlled]);

    const handleTabChange = (_event: React.SyntheticEvent, value: number) => {
        const nextTab: NotesTab = value === 0 ? 'current' : 'previous';
        if (!showPreviousTab && nextTab !== 'current') {
            return;
        }
        setActiveTab(nextTab);
        onTabChange?.(nextTab);
    };

    const openMobilePanel = () => {
        if (isMobileControlled) {
            onMobileOpen?.();
        } else {
            setInternalMobileOpen(true);
        }
    };

    const closeMobilePanel = () => {
        if (!useSheet) return;
        if (isMobileControlled) {
            onMobileClose?.();
        } else {
            setInternalMobileOpen(false);
        }
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
                        overflow: 'hidden',
                        display: activeTab === 'current' ? 'flex' : 'none',
                        width: '100%'
                    }}
                >
                    <CurrentLessonNote
                        lessonId={lessonId}
                        lessonTitle={lessonTitle}
                        isActive={activeTab === 'current' && (useSheet ? mobileOpen : true)}
                        canEdit={canEdit}
                        pollIntervalMs={pollIntervalMs}
                        incomingSoftSync={incomingSoftSync}
                        onBroadcastSoftSync={onBroadcastSoftSync}
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
                            isActive={activeTab === 'previous' && (useSheet ? mobileOpen : true)}
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
        incomingSoftSync,
        onBroadcastSoftSync,
        studentId,
        teacherId,
        initialPreviousLessonId,
        onSelectPreviousLesson,
        mobileOpen,
        controlledFormat,
        hideFormatControl,
        hideStatusChip,
        onStatusChange,
        showPreviousTab,
        useSheet
    ]);

    if (!forceInline && useSheet) {
        return (
            <>
                {!isMobileControlled && (
                    <Button
                        variant="contained"
                        startIcon={<NoteAltOutlinedIcon />}
                        onClick={openMobilePanel}
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        Open notes
                    </Button>
                )}
                <Drawer
                    anchor="bottom"
                    open={mobileOpen}
                    onClose={closeMobilePanel}
                    PaperProps={{
                        sx: {
                            borderTopLeftRadius: 3,
                            borderTopRightRadius: 3,
                            height: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: theme.shadows[8]
                        }
                    }}
                >
                    <Box sx={{ py: 1.5 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 4,
                                borderRadius: 999,
                                backgroundColor: 'divider',
                                mx: 'auto'
                            }}
                            aria-hidden
                        />
                    </Box>
                    <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1">Lesson Notes</Typography>
                        <Button onClick={closeMobilePanel} size="small">
                            Close
                        </Button>
                    </Box>
                    <Divider />
                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        {panelContent}
                    </Box>
                </Drawer>
            </>
        );
    }

    if (hideContainerChrome) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {panelContent}
            </Box>
        );
    }

    return (
        <Paper
            elevation={1}
            sx={{
                height: '100%',
                minHeight: 480,
                maxWidth: 480,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NoteAltOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1">Lesson Notes</Typography>
            </Box>
            <Divider />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {panelContent}
            </Box>
        </Paper>
    );
};

export default LessonNotesPanel;
