import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import GapToken from './GapToken';
import { gapTokensToNodes, GAP_REGEX } from '../../utils/grammarUtils';
import { useGrammarItems, useScoreGrammar } from '../../hooks/useGrammarItems';
import { GrammarScoreResponse } from '../../services/api';
import { UseSyncedGrammarResult } from '../../hooks/useSyncedGrammar';
import { StyledChat } from '../lessonDetail/StyledChat';
import MultipleChoicePlayer from './MultipleChoicePlayer';

// Define a numeric constant for the multiple choice answer key
const MC_CHOICE_KEY = -1; // Using -1 as it's unlikely to conflict with gap indices

interface SyncedGrammarPlayerProps {
  useSyncedGrammar: UseSyncedGrammarResult;
}

const SyncedGrammarPlayer: React.FC<SyncedGrammarPlayerProps> = ({ useSyncedGrammar }) => {
  const { state, updateAnswer } = useSyncedGrammar;
  const [scoreResult, setScoreResult] = useState<GrammarScoreResponse | null>(null);
  const [showScoreFeedback, setShowScoreFeedback] = useState(false);

  // If the grammar is not open, don't render anything
  if (!state.open || !state.material) {
    return null;
  }

  const { data: grammarItems = [], isLoading, error } = useGrammarItems(state.material.id);
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
        isCorrect: r.isCorrect,
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
      editable: true, // Allow editing in synced mode
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
        // Only process GAP_FILL items with the editor
        if (item.type === 'GAP_FILL') {
          // Use synced answers from the state
          const itemAnswers = state.answers[item.id] || {};
          const content = gapTokensToNodes(item.text, itemAnswers);

          // If this is the first GAP_FILL item, set the content directly
          if (index === 0) {
            editor.commands.setContent(content);
          }
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
  }, [editor, grammarItems, state.answers]);

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
  const handleGapChange = (itemId: string, idx: number, val: string) => {
    // Use the updateAnswer method from useSyncedGrammar
    updateAnswer(itemId, idx, val);
  };

  // Handler for multiple choice answers
  const handleMultipleChoiceChange = (itemId: string, chosenIndex: number) => {
    // Use the updateAnswer method from useSyncedGrammar with a special key for multiple choice
    updateAnswer(itemId, MC_CHOICE_KEY, chosenIndex.toString());
  };

  const allQuestionsAnswered = useMemo(() => {
    return grammarItems.every(item => {
      const itemAnswers = state.answers[item.id] || {};

      if (item.type === 'GAP_FILL') {
        const gaps = [...item.text.matchAll(GAP_REGEX)].map(m => Number(m[1]));
        return gaps.every(g => itemAnswers[g] && itemAnswers[g].trim() !== '');
      } else if (item.type === 'MULTIPLE_CHOICE') {
        // For multiple choice, check if an answer has been selected
        return itemAnswers[MC_CHOICE_KEY] !== undefined;
      }

      return false;
    });
  }, [state.answers, grammarItems]);

  const handleCheck = () => {
    if (!allQuestionsAnswered) return;

    const payload = {
      attempts: grammarItems.map(item => {
        if (item.type === 'GAP_FILL') {
          const gaps = [...item.text.matchAll(GAP_REGEX)].map(m => Number(m[1]));
          return {
            grammarItemId: item.id,
            gapAnswers: gaps.map(g => state.answers[item.id]?.[g] || ''),
          };
        } else if (item.type === 'MULTIPLE_CHOICE') {
          // For multiple choice, we send the chosen index as a single-element array
          return {
            grammarItemId: item.id,
            gapAnswers: [state.answers[item.id]?.[MC_CHOICE_KEY] || ''],
          };
        }
        return {
          grammarItemId: item.id,
          gapAnswers: [],
        };
      }),
    };

    // We've already checked that state.material is not null at the beginning of the component
    // but TypeScript doesn't recognize this, so we need to add a check here
    if (!state.material) {
      console.error('Material is null');
      return;
    }

    scoreMutation.mutate(
      { materialId: state.material.id, payload },
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
  if (isLoading) return (<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>);
  if (error) return (<Box sx={{ p: 2 }}><Typography color="error">Error loading exercise</Typography></Box>);
  if (!grammarItems.length) return (<Box sx={{ p: 2 }}><Typography>No grammar exercises found</Typography></Box>);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Grammar content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* We render each exercise with its own title */}
        {grammarItems.map((item, i) => (
          <Paper key={item.id} sx={{ p: 2, mb: 2 }} data-item-id={item.id}>
            <Typography variant="subtitle1" gutterBottom>Exercise {i + 1}</Typography>
            {item.type === 'GAP_FILL' && i === 0 && (
              <EditorContent editor={editor} />
            )}
            {item.type === 'MULTIPLE_CHOICE' && (
              <MultipleChoicePlayer
                question={item.text}
                options={item.options || []}
                chosenIndex={state.answers[item.id]?.[MC_CHOICE_KEY] ? parseInt(state.answers[item.id][MC_CHOICE_KEY]) : -1}
                correctIndex={scoreResult ? parseInt(scoreResult.details.find(d => d.grammarItemId === item.id)?.gapResults[0]?.correct || '-1') : undefined}
                showResults={!!scoreResult}
                onChange={(index) => handleMultipleChoiceChange(item.id, index)}
                itemId={item.id}
              />
            )}
          </Paper>
        ))}

        {/* footer with check */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
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

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleCheck}
              disabled={!allQuestionsAnswered || scoreMutation.isPending}
            >
              {scoreMutation.isPending ? 'Checking…' : 'Check'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Chat */}
      <Box sx={{ height: '40%', minHeight: 0, overflow: 'hidden', borderTop: '1px solid', borderColor: 'divider' }}>
        <StyledChat />
      </Box>

      {/* snackbar */}
      <Snackbar
        open={showScoreFeedback}
        autoHideDuration={6000}
        onClose={() => setShowScoreFeedback(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowScoreFeedback(false)}
          severity={scoreResult?.correctGaps === scoreResult?.totalGaps ? 'success' : 'info'}
          sx={{ width: '100%' }}
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

export default SyncedGrammarPlayer;
