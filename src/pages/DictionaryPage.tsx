import React, {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Stack,
    Button,
    Pagination,
    Chip,
    Divider,
    useMediaQuery,
    useTheme,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    alpha,
    CircularProgress
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import PageHeader from '../components/PageHeader';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import {
    useDictionary,
    useDeleteWord,
    useCreateWord,
    useUpdateWord
} from '../hooks/useVocabulary';
import {useAssignments, useAssignWords, useUpdateAssignment} from '../hooks/useAssignments';
import WordGrid from '../components/vocabulary/WordGrid';
import VocabularyList from '../components/vocabulary/VocabularyList';
import CategoryTabs from '../components/vocabulary/CategoryTabs';
import GenerateWordDialog from '../components/vocabulary/GenerateWordDialog';
import ReviewWordDialog from '../components/vocabulary/ReviewWordDialog';
import QuizMode from '../components/vocabulary/QuizMode';
import VocabularyRoundSetup from '../components/vocabulary/VocabularyRoundSetup';
import AssignStudentModal from '../components/vocabulary/AssignStudentModal';
import BatchAddWordsDialog from '../components/vocabulary/BatchAddWordsDialog';
import {BatchWordsCreateResponse, VocabularyWord} from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 12;
const EMPTY_ARRAY: any[] = [];

const DictionaryPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const isTeacher = user?.role === 'tutor';

    // Tab state for student view (My Vocabulary / Vocabulary Library)
    const [activeTab, setActiveTab] = useState<'my-vocabulary' | 'library'>('my-vocabulary');

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1); // 1-based for Pagination component
    const [category, setCategory] = useState<'0' | '1' | '2' | '3' | '4' | '5'>('0');
    const [filterState, setFilterState] = useState<'all' | 'learned' | 'not-learned'>('all');
    const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to first page on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Fetch words assigned to the student (if user is a student)
    const {data: assignedWords = EMPTY_ARRAY} = useAssignments(user?.id || '');

    // State to track assigned word IDs for quick lookup
    const [assignedWordIdsState, setAssignedWordIdsState] = useState(new Set<string>());

    // Create a map of assigned word IDs for quick lookup
    const assignedWordIds = useMemo(() => {
        const ids = new Set<string>();
        assignedWords.forEach(assignment => ids.add(assignment.vocabularyWordId));
        return ids;
    }, [assignedWords]);

    // Update the state when assignedWordIds changes
    useEffect(() => {
        setAssignedWordIdsState(new Set(assignedWordIds));
    }, [assignedWordIds]);

    const myVocabularyIds = useMemo(
        () => (!isTeacher && activeTab === 'my-vocabulary') ? Array.from(assignedWordIds) : undefined,
        [isTeacher, activeTab, assignedWordIds]
    );

    const shouldFetchDictionary = isTeacher || activeTab !== 'my-vocabulary' || (myVocabularyIds?.length ?? 0) > 0;

    // Fetch vocabulary words with server-side pagination and filtering
    const {data: wordsPage, isLoading: wordsLoading, refetch: refetchWords} = useDictionary({
        text: debouncedSearch,
        difficulty: category === '0' ? undefined : category,
        page: page - 1,
        size: ITEMS_PER_PAGE,
        ids: myVocabularyIds,
        sort: 'createdAt,desc'
    }, {
        enabled: shouldFetchDictionary
    });

    const words = useMemo(() => wordsPage?.content ?? EMPTY_ARRAY, [wordsPage]);
    const totalPages = wordsPage?.totalPages || 0;

    // Hook for assigning words to students
    const assignWords = useAssignWords();

    // Create a map of vocabulary word IDs to assignment IDs and statuses
    const assignmentMap = useMemo(() => {
        const map = new Map<string, { id: string, status: string }>();
        assignedWords.forEach(assignment => {
            map.set(assignment.vocabularyWordId, { 
                id: assignment.id, 
                status: assignment.status 
            });
        });
        return map;
    }, [assignedWords]);

    // Initialize learnedWords based on assignment status
    useEffect(() => {
        const learned = new Set<string>();
        assignedWords.forEach(assignment => {
            if (assignment.status === 'COMPLETED') {
                learned.add(assignment.vocabularyWordId);
            }
        });
        setLearnedWords(learned);
    }, [assignedWords]);

    // Get words for the current view based on user role and active tab
    const displayWords = useMemo(() => {
        if (isTeacher) {
            return words;
        } else {
            if (activeTab === 'my-vocabulary') {
                return words.filter(word => assignedWordIdsState.has(word.id));
            } else {
                return words.filter(word => !assignedWordIdsState.has(word.id));
            }
        }
    }, [isTeacher, words, activeTab, assignedWordIdsState]);

    // Get words for quiz
    const quizWords = useMemo(() => {
        if (isTeacher) {
            return words;
        } else {
            return words.filter(word => assignedWordIdsState.has(word.id));
        }
    }, [isTeacher, words, assignedWordIdsState]);

    const deleteWord = useDeleteWord();
    useCreateWord();
    const updateWord = useUpdateWord();
    const updateAssignment = useUpdateAssignment();
    const [genOpen, setGenOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [quizOpen, setQuizOpen] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [initialSessionSize, setInitialSessionSize] = useState<number | undefined>(undefined);
    const [repeatLearnedMode, setRepeatLearnedMode] = useState(false);
    const [allowAnyCount, setAllowAnyCount] = useState(false);
    const [questionWords, setQuestionWords] = useState<VocabularyWord[] | null>(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);
    const [selected, setSelected] = useState<VocabularyWord | null>(null);

    useEffect(() => {
        setPage(1);
    }, [activeTab, category, filterState]);

    // State for word selection (for assigning to students)
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState(false);

    // State for Snackbar notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // ------- FILTER -------
    const filtered = useMemo(
        () =>
            displayWords.filter(w => {
                let matchFilter = true;
                if (filterState === 'learned') {
                    matchFilter = learnedWords.has(w.id);
                } else if (filterState === 'not-learned') {
                    matchFilter = !learnedWords.has(w.id);
                }
                return matchFilter;
            }),
        [displayWords, filterState, learnedWords]
    );

    const paginated = filtered;

    const handleWordEdit = (word: VocabularyWord) => {
        setSelected(word);
        setReviewOpen(true);
    };

    const handleReviewSave = (patch: Partial<VocabularyWord>) => {
        if (selected) {
            updateWord.mutate({id: selected.id, dto: patch});
        }
    };

    const handleToggleLearned = (id: string) => {
        if (!user) return;

        // Get the assignment for this word
        const assignment = assignmentMap.get(id);
        if (!assignment) {
            console.error(`No assignment found for word ID: ${id}`);
            return;
        }

        // Determine the new status
        const isCurrentlyLearned = learnedWords.has(id);
        const newStatus = isCurrentlyLearned ? 'IN_PROGRESS' : 'COMPLETED';

        // Update the assignment status
        updateAssignment.mutate(
            { 
                id: assignment.id, 
                status: newStatus, 
                studentId: user.id 
            },
            {
                onSuccess: () => {
                    // Update the local state to reflect the change immediately
                    setLearnedWords(prev => {
                        const newSet = new Set(prev);
                        if (isCurrentlyLearned) {
                            newSet.delete(id);
                        } else {
                            newSet.add(id);
                        }
                        return newSet;
                    });
                },
                onError: (error) => {
                    console.error('Failed to update assignment status:', error);
                    setSnackbarMessage('Failed to update word status. Please try again.');
                    setSnackbarSeverity('error');
                    setSnackbarOpen(true);
                }
            }
        );
    };

    // Function to add a word from the library to the student's personal vocabulary
    const handleAddToMyVocabulary = (id: string) => {
        if (!user) return;

        // Create assignment request
        const dto = { 
            studentId: user.id, 
            vocabularyWordIds: [id] 
        };

        // Use the assignWords hook to assign the word to the student
        assignWords.mutate(dto, {
            onSuccess: () => {
                // Update the assignedWordIdsState to include the newly assigned word
                // This ensures the word appears in "My Vocabulary" and disappears from Library
                setAssignedWordIdsState(prev => {
                    const newSet = new Set(prev);
                    newSet.add(id);
                    return newSet;
                });

                // Show success message with Snackbar
                setSnackbarMessage('Word added to your vocabulary!');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);

                // No longer navigate to My Vocabulary tab automatically
            },
            onError: (error) => {
                console.error('Failed to add word to vocabulary:', error);
                setSnackbarMessage('Failed to add word to your vocabulary. Please try again.');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            }
        });
    };

    // Toggle selection mode for assigning words to students
    const toggleSelectionMode = () => {
        setSelectionMode(prev => !prev);
        if (selectionMode) {
            // Clear selections when exiting selection mode
            setSelectedWords([]);
        }
    };

    // Toggle word selection
    const handleToggleSelection = (id: string) => {
        setSelectedWords(prev => {
            if (prev.includes(id)) {
                return prev.filter(wordId => wordId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleBatchCreated = (result: BatchWordsCreateResponse) => {
        const wordIds = result.allWordIdsForHomework;
        if (!wordIds.length) {
            setSnackbarMessage('Batch saved, but no words available for homework.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        const params = new URLSearchParams();
        params.set('create', '1');
        params.set('vocabWordIds', wordIds.join(','));
        setBatchOpen(false);
        navigate(`/t/homework?${params.toString()}`);
    };

    return (
        <Box
            sx={{
                p: { xs: 1, sm: 1 },
                bgcolor: '#fafbfd',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
                <PageHeader
                    title="Vocabulary"
                    icon={<SchoolIcon />}
                    titleColor="primary"
                    actions={
                        isTeacher ? (
                            // Teacher actions
                            <Stack direction="row" spacing={1}>
                                {selectionMode ? (
                                    <>
                                        <Button
                                            variant="outlined"
                                            onClick={toggleSelectionMode}
                                            sx={{
                                                borderRadius: 2,
                                                borderColor: 'error.main',
                                                color: 'error.main',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255, 72, 66, 0.1)'
                                                }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={() => setAssignOpen(true)}
                                            disabled={selectedWords.length === 0}
                                            sx={{
                                                borderRadius: 2,
                                                bgcolor: '#2573ff',
                                                '&:hover': {
                                                    bgcolor: '#1a5cd1'
                                                }
                                            }}
                                        >
                                            Assign {selectedWords.length} Word{selectedWords.length !== 1 ? 's' : ''}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="outlined"
                                            onClick={toggleSelectionMode}
                                            startIcon={<PersonAddIcon />}
                                            sx={{
                                                borderRadius: 2,
                                                borderColor: '#00d7c2',
                                                color: '#00d7c2',
                                                '&:hover': {
                                                    borderColor: '#00b3a1',
                                                    bgcolor: 'rgba(0, 215, 194, 0.1)'
                                                }
                                            }}
                                        >
                                            Select Words to Assign
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={() => setGenOpen(true)}
                                            startIcon={<AddIcon />}
                                            sx={{
                                                borderRadius: 2,
                                                bgcolor: '#2573ff',
                                                '&:hover': {
                                                    bgcolor: '#1a5cd1'
                                                }
                                            }}
                                        >
                                            Add Word
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setBatchOpen(true)}
                                            startIcon={<AddIcon />}
                                            sx={{
                                                borderRadius: 2
                                            }}
                                        >
                                            Batch Add
                                        </Button>
                                    </>
                                )}
                            </Stack>
                        ) : (
                            // Student actions
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setRepeatLearnedMode(false);
                                        setAllowAnyCount(false);
                                        // For student practice, use assigned words (quizWords). If less than 4, pad from learned
                                        const base = quizWords.slice();
                                        if (base.length < 4) {
                                            const learnedOnly = quizWords.filter(w => learnedWords.has(w.id));
                                            let idx = 0;
                                            while (base.length < 4 && learnedOnly.length > 0) {
                                                base.push(learnedOnly[idx % learnedOnly.length]);
                                                idx++;
                                            }
                                            // If still less than 4 and no learned available, allow any count
                                            if (base.length < 4) setAllowAnyCount(true);
                                        }
                                        setQuestionWords(base);
                                        setSetupOpen(true);
                                    }}
                                    startIcon={<SchoolIcon />}
                                    sx={{
                                        borderRadius: 2,
                                        borderColor: '#00d7c2',
                                        color: '#00d7c2',
                                        '&:hover': {
                                            borderColor: '#00b3a1',
                                            bgcolor: 'rgba(0, 215, 194, 0.1)'
                                        }
                                    }}
                                >
                                    Practice
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        setRepeatLearnedMode(true);
                                        const learnedOnly = quizWords.filter(w => learnedWords.has(w.id));
                                        setQuestionWords(learnedOnly);
                                        setAllowAnyCount(true);
                                        setSetupOpen(true);
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: '#2573ff',
                                        '&:hover': {
                                            bgcolor: '#1a5cd1'
                                        }
                                    }}
                                    disabled={quizWords.filter(w => learnedWords.has(w.id)).length === 0}
                                >
                                    Repeat learned
                                </Button>
                            </Stack>
                        )
                    }
                    secondaryRow={
                        !isTeacher ? (
                            <Box>
                                <Tabs
                                    value={activeTab}
                                    onChange={(_, newValue) => setActiveTab(newValue)}
                                    sx={{
                                        mb: 2,
                                        '& .MuiTab-root': {
                                            minWidth: 'auto',
                                            px: 3,
                                            py: 1,
                                            borderRadius: 2,
                                            mr: 1,
                                            color: 'text.secondary',
                                            '&.Mui-selected': {
                                                color: '#2573ff',
                                                fontWeight: 600
                                            }
                                        },
                                        '& .MuiTabs-indicator': {
                                            height: 3,
                                            borderRadius: 1.5
                                        }
                                    }}
                                >
                                    <Tab
                                        value="my-vocabulary"
                                        label="My Vocabulary"
                                        icon={<BookmarkIcon />}
                                        iconPosition="start"
                                    />
                                    <Tab
                                        value="library"
                                        label="Vocabulary Library"
                                        icon={<LibraryBooksIcon />}
                                        iconPosition="start"
                                    />
                                </Tabs>
                                <Typography variant="body2" color="text.secondary">
                                    {activeTab === 'my-vocabulary'
                                        ? 'Words assigned to you by your teacher. Practice these to improve your vocabulary.'
                                        : 'Browse all available vocabulary words. Add interesting words to your personal vocabulary.'}
                                </Typography>
                            </Box>
                        ) : undefined
                    }
                />

                {/* Search & Filters */}
                <Box
                    sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.08)'
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        mb={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                        <TextField
                            placeholder="Search word…"
                            fullWidth
                            size="small"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />

                        {/* View mode toggle (grid/list) */}
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, newMode) => {
                                if (newMode !== null) {
                                    setViewMode(newMode);
                                }
                            }}
                            aria-label="view mode"
                            size="small"
                            sx={{
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 2,
                                '& .MuiToggleButton-root': {
                                    border: 'none',
                                    px: 1.5,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.15)
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="grid" aria-label="grid view">
                                <Tooltip title="Card View">
                                    <ViewModuleIcon fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                            <ToggleButton value="list" aria-label="list view">
                                <Tooltip title="List View">
                                    <ViewListIcon fontSize="small" />
                                </Tooltip>
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Chip
                            icon={<FilterListIcon />}
                            label={
                                filterState === 'all'
                                    ? "All words"
                                    : filterState === 'learned'
                                        ? "Learned words"
                                        : "Words to learn"
                            }
                            clickable
                            color={
                                filterState === 'all'
                                    ? "default"
                                    : filterState === 'learned'
                                        ? "success"
                                        : "primary"
                            }
                            onClick={() => {
                                // Cycle through filter states: all -> learned -> not-learned -> all
                                setFilterState(prev => {
                                    if (prev === 'all') return 'learned';
                                    if (prev === 'learned') return 'not-learned';
                                    return 'all';
                                });
                            }}
                            sx={{
                                borderRadius: 2,
                                bgcolor:
                                    filterState === 'all'
                                        ? 'transparent'
                                        : filterState === 'learned'
                                            ? 'rgba(0, 215, 194, 0.1)'
                                            : 'rgba(37, 115, 255, 0.1)',
                                border:
                                    filterState === 'all'
                                        ? '1px solid rgba(0,0,0,0.12)'
                                        : filterState === 'learned'
                                            ? '1px solid #00d7c2'
                                            : '1px solid #2573ff',
                                '& .MuiChip-icon': {
                                    color:
                                        filterState === 'all'
                                            ? 'inherit'
                                            : filterState === 'learned'
                                                ? '#00d7c2'
                                                : '#2573ff'
                                }
                            }}
                        />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <CategoryTabs value={category} onChange={(v) => setCategory(v as '0' | '1' | '2' | '3' | '4' | '5')} />
                </Box>

                {/* ───── Scrollable Vocabulary Display ───── */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    pr: 0.5,
                    mb: 10
                  }}
                >
                  {wordsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress />
                    </Box>
                  ) : viewMode === 'grid' ? (
                    <WordGrid
                      data={paginated}
                      onDelete={isTeacher && !selectionMode ? id => deleteWord.mutate(id) : undefined}
                      onEdit={isTeacher && !selectionMode ? handleWordEdit : undefined}
                      onToggleLearned={!selectionMode ? handleToggleLearned : undefined}
                      onAddToMyVocabulary={!isTeacher && activeTab === 'library' && !selectionMode ? handleAddToMyVocabulary : undefined}
                      learnedWords={learnedWords}
                      readOnly={!isTeacher && activeTab === 'library'}
                      selectionMode={selectionMode}
                      selectedWords={selectedWords}
                      onToggleSelection={handleToggleSelection}
                      density="compact"
                    />
                  ) : (
                    <VocabularyList
                      data={paginated}
                      onDelete={isTeacher && !selectionMode ? id => deleteWord.mutate(id) : undefined}
                      onEdit={isTeacher && !selectionMode ? handleWordEdit : undefined}
                      onToggleLearned={!selectionMode ? handleToggleLearned : undefined}
                      onAddToMyVocabulary={!isTeacher && activeTab === 'library' && !selectionMode ? handleAddToMyVocabulary : undefined}
                      learnedWords={learnedWords}
                      readOnly={!isTeacher && activeTab === 'library'}
                      selectionMode={selectionMode}
                      selectedWords={selectedWords}
                      onToggleSelection={handleToggleSelection}
                      density="compact"
                    />
                  )}
                </Box>

                {totalPages > 1 && (
                    <Box
                        sx={{
                            bottom: 0,
                            py: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                            position: 'fixed',
                            width: '100%',
                            zIndex: 10
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                            color="primary"
                            size={isMobile ? 'small' : 'medium'}
                            showFirstButton
                            showLastButton
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                '& .MuiPaginationItem-root': { borderRadius: 2 },
                                '& .Mui-selected': {
                                    bgcolor: '#2573ff !important',
                                    color: 'white'
                                }
                            }}
                        />
                    </Box>
                )}

            {/* Dialogs */}
            <GenerateWordDialog
                open={genOpen}
                onSaved={() => {
                    setPage(1);
                    refetchWords();
                }}
                onClose={() => {
                    setGenOpen(false);
                    refetchWords(); // Refetch words when dialog is closed
                }}
            />

            <BatchAddWordsDialog
                open={batchOpen}
                teacherId={user?.id}
                onClose={() => setBatchOpen(false)}
                onCreated={handleBatchCreated}
            />

            <ReviewWordDialog
                open={reviewOpen}
                data={selected}
                onSave={handleReviewSave}
                onClose={() => {
                    setReviewOpen(false);
                    refetchWords(); // Refetch words when dialog is closed
                }}
            />

            <VocabularyRoundSetup
                open={setupOpen}
                onClose={() => setSetupOpen(false)}
                words={quizWords}
                questionWords={questionWords || undefined}
                onStart={({ sessionSize }) => {
                    setInitialSessionSize(sessionSize);
                    setSetupOpen(false);
                    setQuizOpen(true);
                }}
                allowAnyCount={allowAnyCount}
            />

            <QuizMode
                open={quizOpen}
                onClose={() => {
                    setQuizOpen(false);
                    setInitialSessionSize(undefined);
                    setQuestionWords(null);
                    setAllowAnyCount(false);
                    setRepeatLearnedMode(false);
                    refetchWords(); // Refetch words when dialog is closed
                }}
                words={quizWords}
                questionWords={questionWords || undefined}
                initialSessionSize={initialSessionSize}
                allowAnyCount={allowAnyCount}
            />

            {/* Modal for assigning words to students */}
            <AssignStudentModal
                open={assignOpen}
                onClose={() => {
                    setAssignOpen(false);
                    // Exit selection mode after assigning
                    if (selectionMode) {
                        setSelectionMode(false);
                        setSelectedWords([]);
                    }
                    refetchWords(); // Refetch words when dialog is closed
                }}
                selectedWords={selectedWords}
            />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    variant="filled"
                    sx={{
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: 2
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DictionaryPage;
