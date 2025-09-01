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
    itemIds?: string[];
    onAttempt?: (itemId: string, gapIndex: number, value: string) => void;
}
/* ------------------------------------------------------------------ */
/* Main GrammarPlayer                                                 */
/* ------------------------------------------------------------------ */
const GrammarPlayer: React.FC<GrammarPlayerProps> = ({
                                                         materialId,
                                                         onClose,
                                                         itemIds,
                                                         onAttempt,
                                                     }) => {
    const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
    const [scoreResult, setScoreResult] = useState<GrammarScoreResponse | null>(null);
    const [showScoreFeedback, setShowScoreFeedback] = useState(false);

    const { data: allItems = [], isLoading, error } = useGrammarItems(materialId);
    const grammarItems = useMemo(
        () => (itemIds && itemIds.length ? allItems.filter(it => itemIds.includes(it.id)) : allItems),
        [allItems, itemIds]
    );
    const scoreMutation = useScoreGrammar();

    // Create a ref to track the currently focused item
    const focusedItemRef = useRef<string | null>(null);

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

        // Get the current focused item ID
        const currentItemId = focusedItemRef.current;

        // Get the gap results for the current item
        const currentGapResults = currentItemId && scoreResult
            ? scoreResult.details.find(d => d.grammarItemId === currentItemId)?.gapResults.map(r => ({
                index: r.index,
                isCorrect: r.isCorrect, // This might be undefined in some API responses
                student: r.student,
                correct: r.correct,
              }))
            : [];

        return [
            StarterKit,
            GapToken.configure({
                mode: 'player',
                onGapChange: (idx, val, itemId) => {
                    if (itemId) {
                        handleGapChange(itemId, idx, val);
                        onAttempt?.(itemId, idx, val);
                    }
                },
                disabled: false,
                gapResults: currentGapResults || [],
            }),
        ];
    }, [scoreResult, focusedItemRef.current]);

    // Create a single editor instance
    const editor = useEditor(
        {
            extensions,
            content: '', // We'll set the content after initialization
            editable: false,
        },
        [extensions]
    );

    useEffect(() => {
        if (!editor || grammarItems.length === 0) return;

        /* ---------- remember which actual element is focused ---------- */
        const allInputsBefore = Array.from(
            document.querySelectorAll<HTMLInputElement>('.gap-token-input')
        );
        const activeEl       = document.activeElement as HTMLInputElement | null;
        const activeIndex    = activeEl && activeEl.classList.contains('gap-token-input')
            ? allInputsBefore.indexOf(activeEl)
            : -1;
        const selStart       = activeEl?.selectionStart ?? 0;
        const selEnd         = activeEl?.selectionEnd   ?? 0;

        /* ---------- rebuild the editor’s content ---------- */
        grammarItems.forEach((item, idx) => {
            const itemAnswers = answers[item.id] ?? {};
            const content     = gapTokensToNodes(item.text, itemAnswers);
            if (idx === 0) editor.commands.setContent(content);
        });

        /* ---------- restore focus on the *same position* gap ---------- */
        if (activeIndex !== -1) {
            requestAnimationFrame(() => {
                const allInputsAfter = document.querySelectorAll<HTMLInputElement>(
                    '.gap-token-input'
                );
                const sameSpotInput = allInputsAfter[activeIndex];
                if (sameSpotInput) {
                    sameSpotInput.focus();
                    try {
                        sameSpotInput.setSelectionRange(selStart, selEnd);
                    } catch (_) {/* ignore */}
                }
            });
        }
    }, [editor, grammarItems, answers]);


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

    // Listen for remote attempts (e.g., from student -> tutor mirroring)
    useEffect(() => {
        const handler = (evt: any) => {
            const d = evt.detail || {};
            if (d?.materialId !== materialId) return;
            const { itemId, gapIndex, value } = d;
            if (!itemId || typeof gapIndex !== 'number') return;
            setAnswers(prev => ({
                ...prev,
                [itemId]: { ...(prev[itemId] || {}), [gapIndex]: value }
            }));
        };
        window.addEventListener('GRAMMAR_BLOCK_ATTEMPT', handler as any);
        return () => window.removeEventListener('GRAMMAR_BLOCK_ATTEMPT', handler as any);
    }, [materialId]);

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
                        disabled={!allGapsFilled || scoreMutation.isPending}
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
