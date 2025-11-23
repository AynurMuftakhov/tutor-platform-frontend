import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { generateLessonText } from '../../../services/api';
import type { GenerateLessonTextRequest } from '../../../services/api';
import { sanitizeHtml } from '../student/StudentRenderer';

interface Props {
  open: boolean;
  initialHtml?: string;
  lessonTitle?: string;
  onClose: () => void;
  onApply: (html: string) => void;
}

const DEFAULT_PROMPT = 'Act as an English methodologist. Create a short, student-friendly text that fits the lesson goal. Use simple language, include concrete examples, and keep the tone encouraging.';

const TextAiDialog: React.FC<Props> = ({ open, initialHtml, lessonTitle, onClose, onApply }) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [draftHtml, setDraftHtml] = useState<string>(initialHtml ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrompt(DEFAULT_PROMPT);
      setDraftHtml(initialHtml ?? '');
      setError(null);
      setInfo(null);
    }
  }, [open, initialHtml]);

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateLessonTextRequest) => {
      if (!user?.id) {
        throw new Error('Sign in to generate text with AI.');
      }
      return generateLessonText(user.id, payload);
    },
  });

  const applyPrompt = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Prompt is required.');
      return;
    }
    setError(null);
    setInfo('Generating text...');
    try {
      const context = draftHtml || initialHtml || '';
      const res = await generateMutation.mutateAsync({
        prompt: trimmedPrompt,
        existingText: context ? sanitizeHtml(context) : undefined,
        lessonTitle: lessonTitle || undefined,
      });
      const safe = sanitizeHtml(res.html || '');
      setDraftHtml(safe);
      setInfo('Generated. You can tweak the text or run another prompt to adjust it further.');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to generate text.';
      setError(message);
      setInfo(null);
    }
  };

  const handleApply = () => {
    onApply(sanitizeHtml(draftHtml || ''));
    onClose();
  };

  const promptHelper = useMemo(() => {
    if (!draftHtml) return 'First generation will create a draft based on your prompt.';
    return 'We send the current text as context so clarifying prompts refine it instead of starting from scratch.';
  }, [draftHtml]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Generate text with AI</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={0.5}>
          <Typography variant="body2" color="text.secondary">
            Write what you need. The AI behaves like an English methodologist and returns clean HTML. You can edit the result manually before saving.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="info">{info}</Alert>}
          <TextField
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            helperText={promptHelper}
          />
          <Box>
            <Button
              variant="contained"
              onClick={applyPrompt}
              disabled={generateMutation.isPending || !user?.id}
              startIcon={generateMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : undefined}
            >
              {generateMutation.isPending ? 'Generating…' : 'Generate / Adjust'}
            </Button>
            {!user?.id && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Sign in to use AI generation.
              </Typography>
            )}
          </Box>
          <Box sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Formatted preview</Typography>
            <Box
              sx={{
                mt: 0.5,
                '& p': { m: 0, mb: 1 },
                '& ul, & ol': { pl: 3, mb: 1 },
                '& *': { color: 'inherit' },
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(draftHtml || '') }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={generateMutation.isPending}>Cancel</Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={generateMutation.isPending || (!draftHtml && !initialHtml)}
        >
          Save to block
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TextAiDialog;
