import React, {useState, useMemo, useRef, useEffect} from 'react';
import { Box, Button, Typography, Paper, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import GapToken from './GapToken';
import { gapTokensToNodes, GAP_REGEX } from '../../utils/grammarUtils';
import { useGrammarItems, useScoreGrammar } from '../../hooks/useGrammarItems';
import {GrammarScoreResponse} from '../../services/api';

interface GrammarPlayerProps {
    materialId: string;
    onClose?: () => void;
}
/* ------------------------------------------------------------------ */
/* Main GrammarPlayer                                                 */
/* ------------------------------------------------------------------ */
const GrammarPlayer: React.FC<GrammarPlayerProps> = ({
                                                         materialId,
                                                         onClose,
                                                     }) => {
    const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
    const [scoreResult, setScoreResult] = useState<GrammarScoreResponse | null>(null);
    const [showScoreFeedback, setShowScoreFeedback] = useState(false);

    const { data: grammarItems = [], isLoading, error } = useGrammarItems(materialId);
    const scoreMutation = useScoreGrammar();

    // Create a single editor instance for all items
    const extensions = useMemo(() => {
        // Create a map of item IDs to their gap results
        const gapResultsMap: Record<string, { index: number; isCorrect: boolean; correct: string }[]> = {};
        if (scoreResult) {
            scoreResult.details.forEach(detail => {
                gapResultsMap[detail.grammarItemId] = detail.gapResults.map(r => ({
                    index: r.index,
                    isCorrect: r.isCorrect,
                    correct: r.correct,
                }));
            });
        }

        return [
            StarterKit,
            GapToken.configure({
                mode: 'player',
                onGapChange: (idx, val, itemId) => {
                    if (itemId) {
                        handleGapChange(itemId, idx, val);
                    }
                },
                disabled: !!scoreResult,
                gapResults: [], // We'll handle this differently now
            }),
        ];
    }, [scoreResult]);

    // Create a single editor instance
    const editor = useEditor(
        {
            extensions,
            content: '', // We'll set the content after initialization
            editable: false,
        },
        [extensions]
    );

    // Update editor content when items or answers change
    useEffect(() => {
        if (editor && grammarItems.length > 0) {
            // Get the currently focused element before updating content
            const activeElement = document.activeElement;
            let focusedInput: HTMLInputElement | null = null;
            let focusedInputValue = '';
            let focusedInputSelectionStart = 0;
            let focusedInputSelectionEnd = 0;

            if (activeElement instanceof HTMLInputElement && activeElement.classList.contains('gap-token-input')) {
                focusedInput = activeElement;
                focusedInputValue = focusedInput.value;
                focusedInputSelectionStart = focusedInput.selectionStart || 0;
                focusedInputSelectionEnd = focusedInput.selectionEnd || 0;
            }

            // Create content for each item separately
            grammarItems.forEach((item, index) => {
                const itemAnswers = answers[item.id] || {};
                const content = gapTokensToNodes(item.text, itemAnswers);

                // If this is the first item, set the content directly
                if (index === 0) {
                    editor.commands.setContent(content);
                }
            });

            // Restore focus after content update
            if (focusedInput) {
                requestAnimationFrame(() => {
                    // Find the input with the same value and position
                    const inputs = document.querySelectorAll('.gap-token-input');
                    for (const input of inputs) {
                        if (input instanceof HTMLInputElement && input.value === focusedInputValue) {
                            input.focus();
                            try {
                                input.setSelectionRange(focusedInputSelectionStart, focusedInputSelectionEnd);
                            } catch (e) {
                                console.error('Failed to set selection range:', e);
                            }
                            break;
                        }
                    }
                });
            }
        }
    }, [editor, grammarItems, answers]);

    // Create a ref to track the currently focused item
    const focusedItemRef = useRef<string | null>(null);

    // Update the editor when a gap input is focused
    const handleGapFocus = (itemId: string) => {
        focusedItemRef.current = itemId;
    };

    // Add a listener to the GapToken component to track focus
    useEffect(() => {
        if (!editor) return;

        const handleFocus = (e: FocusEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.classList.contains('gap-token-input')) {
                // Find the closest parent with data-item-id
                let parent = e.target.parentElement;
                while (parent) {
                    const itemId = parent.getAttribute('data-item-id');
                    if (itemId) {
                        handleGapFocus(itemId);
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
        };

        // Add the focus event listener to the document
        document.addEventListener('focus', handleFocus, true);

        return () => {
            document.removeEventListener('focus', handleFocus, true);
        };
    }, [editor]);

    /* -------------- helpers ---------------- */
    // This handler correctly updates the state for a specific item and gap index
    const handleGapChange = (itemId: string, idx: number, val: string) =>
        setAnswers(prev => ({
            ...prev,
            [itemId]: { ...(prev[itemId] || {}), [idx]: val },
        }));


    const allGapsFilled = useMemo(() => {
        return grammarItems.every(item => {
            const itemAnswers = answers[item.id] || {};
            const gaps = [...item.text.matchAll(GAP_REGEX)].map(m => Number(m[1]));
            return gaps.every(g => itemAnswers[g] && itemAnswers[g].trim() !== '');
        });
    }, [answers, grammarItems]);

    const handleCheck = () => {
        if (!allGapsFilled) return;

        const payload = {
            attempts: grammarItems.map(item => {
                const gaps = [...item.text.matchAll(GAP_REGEX)].map(m => Number(m[1]));
                return {
                    grammarItemId: item.id,
                    gapAnswers: gaps.map(g => answers[item.id]?.[g] || ''),
                };
            }),
        };

        scoreMutation.mutate(
            { materialId, payload },
            {
                onSuccess: data => {
                    setScoreResult(data);
                    setShowScoreFeedback(true);
                },
                onError: err => console.error(err),
            },
        );
    };

    /* -------------- renders ---------------- */
    if (isLoading) return (<Box sx={{ p:4, textAlign:'center' }}><CircularProgress/></Box>);
    if (error)     return (<Box sx={{ p:2 }}><Typography color="error">Error loading exercise</Typography></Box>);
    if (!grammarItems.length) return (<Box sx={{ p:2 }}><Typography>No grammar exercises found</Typography></Box>);

    return (
        <Box sx={{ width: '100%' }}>
            {/* We render each exercise with its own title */}
            {grammarItems.map((item, i) => (
                <Paper key={item.id} sx={{ p:2, mb:2 }} data-item-id={item.id}>
                    <Typography variant="subtitle1" gutterBottom>Exercise {i + 1}</Typography>
                    {i === 0 && (
                        <EditorContent editor={editor} />
                    )}
                </Paper>
            ))}

            {/* footer with check / close */}
            <Box sx={{ display:'flex', justifyContent:'space-between', mt:2 }}>
                {scoreResult ? (
                    <Chip
                        label={`${scoreResult.correctGaps}/${scoreResult.totalGaps} gaps correct`}
                        color={scoreResult.correctGaps === scoreResult.totalGaps ? 'success' : 'primary'}
                    />
                ) : (
                    <Typography variant="body2" color="textSecondary">
                        Fill all gaps and press Check
                    </Typography>
                )}

                <Box sx={{ display:'flex', gap:2 }}>
                    {onClose && <Button onClick={onClose} variant="outlined">Close</Button>}
                    <Button
                        variant="contained"
                        onClick={handleCheck}
                        disabled={!allGapsFilled || !!scoreResult || scoreMutation.isPending}
                    >
                        {scoreMutation.isPending ? 'Checking…' : 'Check'}
                    </Button>
                </Box>
            </Box>

            {/* snackbar */}
            <Snackbar
                open={showScoreFeedback}
                autoHideDuration={6000}
                onClose={() => setShowScoreFeedback(false)}
                anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
            >
                <Alert
                    onClose={() => setShowScoreFeedback(false)}
                    severity={scoreResult?.correctGaps === scoreResult?.totalGaps ? 'success':'info'}
                    sx={{ width:'100%' }}
                >
                    {scoreResult
                        ? scoreResult.correctGaps === scoreResult.totalGaps
                            ? 'Perfect! All answers are correct.'
                            : `You got ${scoreResult.correctGaps} of ${scoreResult.totalGaps} gaps correct.`
                        : 'Score calculated'}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default GrammarPlayer;
