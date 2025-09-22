import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography, FormControl, InputLabel, Select, MenuItem, Button, FormHelperText, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { VocabularyWord } from '../../types';

interface VocabularyRoundSetupProps {
  open: boolean;
  onClose: () => void;
  words: VocabularyWord[];
  questionWords?: VocabularyWord[];
  onStart: (opts: { sessionSize: number }) => void;
  allowAnyCount?: boolean;
}

const VocabularyRoundSetup: React.FC<VocabularyRoundSetupProps> = ({ open, onClose, words, questionWords, onStart, allowAnyCount }) => {
  const pool = useMemo(() => (questionWords && questionWords.length > 0 ? questionWords : words), [questionWords, words]);
  const total = pool.length;
  const options = useMemo(() => {
    if (total === 0) return [] as number[];
    if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);
    const presets = [5, 10, 15, 20];
    const list = presets.filter(n => n < total);
    if (!list.includes(total)) list.push(total);
    if (total > 10 && !list.includes(10)) list.push(10);
    const uniq = Array.from(new Set(list)).filter(n => n > 0 && n <= total).sort((a, b) => a - b);
    return uniq;
  }, [total]);

  const [value, setValue] = useState<number>(10);

  useEffect(() => {
    const def = Math.max(1, Math.min(10, total || 0));
    setValue(def);
  }, [total, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" keepMounted>
      <DialogTitle>
        Choose words per round
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {total < 4 && !allowAnyCount ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            You need at least 4 vocabulary words to start a quiz.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Assigned: {new Set(pool.map(w => w.id)).size} unique words
            </Typography>
            {options.length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="words-per-round">Words per round</InputLabel>
                <Select<number>
                  labelId="words-per-round"
                  label="Words per round"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                >
                  {options.map(opt => (
                    <MenuItem key={opt} value={opt}>
                      {opt === total ? `All (${opt})` : opt}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText sx={{ mt: 0.5 }}>You can change this next time from this screen</FormHelperText>
              </FormControl>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onStart({ sessionSize: value })}
          disabled={!allowAnyCount && total < 4}
          sx={{ borderRadius: 2, bgcolor: '#2573ff', '&:hover': { bgcolor: '#1a5cd1' } }}
        >
          Start quiz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VocabularyRoundSetup;
