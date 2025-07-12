import React, {useState, useMemo} from 'react';
import { Box, Button, Typography, Paper, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import GapToken from './GapToken';
import { gapTokensToNodes, GAP_REGEX } from '../../utils/grammarUtils';
import { useGrammarItems, useScoreGrammar } from '../../hooks/useGrammarItems';
import {GrammarItemDto, GrammarScoreResponse} from '../../services/api';

interface GrammarPlayerProps {
    materialId: string;
    onClose?: () => void;
}


/* ------------------------------------------------------------------ */
/* Sub-component that owns its own TipTap instance                    */
/* ------------------------------------------------------------------ */
type ItemPlayerProps = {
    item: GrammarItemDto;
    onGapChange: (itemId: string, idx: number, val: string) => void;
    result?: GrammarScoreResponse['details'][number];
    disabled: boolean;
    answers: Record<number, string>;
};

const ItemPlayer: React.FC<ItemPlayerProps> = ({
                                                   item,
                                                   onGapChange,
                                                   result,
                                                   disabled,
                                                   answers,
                                               }) => {
    const gapResults = result?.gapResults.map(r => ({
        index: r.index,
        isCorrect: r.isCorrect,
        correct: r.correct,
    }));

    /* ------------------------------------------------------------
     * Build the extension list reactively so TipTap can re-configure
     * itself whenever answers / result / disabled change.
     * ------------------------------------------------------------ */
    const extensions = useMemo(
        () => [
            StarterKit,
            GapToken.configure({
                mode: 'player',
                onGapChange: (idx, val) => onGapChange(item.id, idx, val),
                disabled,
                gapResults,
            }),
        ],
        [disabled, gapResults, item.id, onGapChange],
    );


    /* ------------------------------------------------------------
     * ❶ pass options object ❷ pass deps array for re-configuration
     * ------------------------------------------------------------ */
    const editor = useEditor(
        {
            extensions,
            content: gapTokensToNodes(item.text, answers),
            editable: false,
        },
        [extensions, answers],
    );

    return <EditorContent editor={editor} />;
};

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
            {grammarItems.map((item, i) => (
                <Paper key={item.id} sx={{ p:2, mb:2 }}>
                    <Typography variant="subtitle1" gutterBottom>Exercise {i + 1}</Typography>
                    <ItemPlayer
                        item={item}
                        answers={answers[item.id] || {}}
                        onGapChange={handleGapChange}
                        result={scoreResult?.details.find(d => d.grammarItemId === item.id)}
                        disabled={!!scoreResult}
                    />
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
