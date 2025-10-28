import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    CircularProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Stack,
    Select,
    MenuItem,
    InputLabel,
    FormHelperText,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { VocabularyWord } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { activityEmitter } from '../../services/tracking/activityEmitter';

interface QuizModeProps {
    open: boolean;
    onClose: () => void;
    words: VocabularyWord[];
    // Optional: limit which words are asked as questions; full words pool remains for answer options
    questionWords?: VocabularyWord[];
    // Optional callbacks for integration (e.g., homework progress)
    onAnswer?: (wordId: string, correct: boolean) => void;
    onComplete?: () => void;
    // Initial words-per-round provided by setup dialog
    initialSessionSize?: number;
    // Allow starting even if fewer than 4 words are available
    allowAnyCount?: boolean;
}

 type QuizType = 'translation' | 'definition' | 'listening';
type QuizQuestion = {
    word: VocabularyWord;
    options: string[];
    correctAnswer: string;
    type: QuizType;
};

const QuizMode: React.FC<QuizModeProps> = ({ open, onClose, words, questionWords, onAnswer, onComplete, initialSessionSize, allowAnyCount }) => {
    const theme = useTheme();
    const [quizType, setQuizType] = useState<QuizType>('translation');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessionSize, setSessionSize] = useState<number>(10);
    const [totalWordCount, setTotalWordCount] = useState<number>(0);
    const [totalUniqueWordCount, setTotalUniqueWordCount] = useState<number>(0);
    const [remainingCount, setRemainingCount] = useState<number>(0);
    const [remainingUniqueCount, setRemainingUniqueCount] = useState<number>(0);
    const [currentRound, setCurrentRound] = useState<number>(1);
    const [hasNextRound, setHasNextRound] = useState<boolean>(false);

    const initializedRef = useRef(false);
    const baseWordsRef = useRef<VocabularyWord[]>([]);
    const queueRef = useRef<VocabularyWord[]>([]);
    const currentBatchRef = useRef<VocabularyWord[]>([]);
    const incorrectQueueRef = useRef<VocabularyWord[]>([]);
    const incorrectSetRef = useRef<Set<string>>(new Set());
    const lastSeedSizeRef = useRef<number>(10);

    // Auto-advance timer for correct answers
    const autoNextTimerRef = useRef<number | null>(null);
    const clearAutoTimer = () => {
      if (autoNextTimerRef.current !== null) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
    };

    // Clear auto-advance timer on unmount
    useEffect(() => {
      return () => {
        try { activityEmitter.emit('vocab_end', '/vocab', { reason: 'unmount' }); } catch {}
        clearAutoTimer();
      };
    }, []);

    const shuffleArray = useCallback(<T,>(input: T[]): T[] => {
      const copy = [...input];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }, []);

    const generateQuestions = useCallback((wordList: VocabularyWord[], poolForOptions: VocabularyWord[], type: QuizType): QuizQuestion[] => {
        const shuffledWords = shuffleArray(wordList);

        return shuffledWords.map(word => {
            const incorrectOptions = shuffleArray(poolForOptions)
                .filter(w => w.id !== word.id)
                .slice(0, 3);

            let correctAnswer = '';
            let options: string[] = [];

            switch (type) {
                case 'translation':
                    correctAnswer = word.translation;
                    options = [
                        word.translation,
                        ...incorrectOptions.map(w => w.translation)
                    ];
                    break;
                case 'definition':
                    correctAnswer = word.definitionEn;
                    options = [
                        word.definitionEn,
                        ...incorrectOptions.map(w => w.definitionEn)
                    ];
                    break;
                case 'listening':
                    correctAnswer = word.text;
                    options = [
                        word.text,
                        ...incorrectOptions.map(w => w.text)
                    ];
                    break;
            }

            options = shuffleArray(options);

            return {
                word,
                options,
                correctAnswer,
                type
            };
        });
    }, [shuffleArray]);

    const computeRemainingUniqueCount = useCallback((): number => {
      const ids = new Set<string>();
      for (const w of queueRef.current) ids.add(w.id);
      for (const w of incorrectQueueRef.current) ids.add(w.id);
      return ids.size;
    }, []);

    const seedSession = useCallback((baseList: VocabularyWord[], desiredSize: number) => {
      const sanitized = baseList.slice();
      baseWordsRef.current = sanitized;
      queueRef.current = shuffleArray(sanitized);
      incorrectQueueRef.current = [];
      incorrectSetRef.current = new Set();

      const safeSize = sanitized.length > 0 ? Math.max(1, Math.min(desiredSize, sanitized.length)) : 0;
      const firstBatch = safeSize > 0 ? queueRef.current.splice(0, safeSize) : [];
      if (firstBatch.length === 0 && sanitized.length > 0) {
        firstBatch.push(...sanitized);
        queueRef.current = [];
      }

      currentBatchRef.current = firstBatch;
      lastSeedSizeRef.current = safeSize || desiredSize;

      setQuestions(firstBatch.length > 0 ? generateQuestions(firstBatch, sanitized, quizType) : []);
      setTotalWordCount(sanitized.length);
      setTotalUniqueWordCount(new Set(sanitized.map(w => w.id)).size);
      setRemainingCount(queueRef.current.length);
      setRemainingUniqueCount(computeRemainingUniqueCount());
      setCurrentRound(1);
      setHasNextRound(queueRef.current.length > 0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);
    }, [generateQuestions, quizType, shuffleArray]);

    const finalizeRound = useCallback(() => {
      clearAutoTimer();
      setQuizComplete(true);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCurrentQuestionIndex(0);

      const remainingTotal = queueRef.current.length + incorrectQueueRef.current.length;
      setRemainingCount(remainingTotal);
      setRemainingUniqueCount(computeRemainingUniqueCount());
      setHasNextRound(remainingTotal > 0);

      if (remainingTotal === 0 && onComplete) {
        onComplete();
      }
    }, [onComplete]);

    const handleRetryCurrentRound = useCallback(() => {
      clearAutoTimer();
      incorrectQueueRef.current = [];
      incorrectSetRef.current.clear();
      setQuestions(generateQuestions(currentBatchRef.current, baseWordsRef.current, quizType));
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);
      const futureRemaining = queueRef.current.length + incorrectQueueRef.current.length;
      setRemainingCount(futureRemaining);
      setRemainingUniqueCount(computeRemainingUniqueCount());
      setHasNextRound(futureRemaining > 0);
    }, [generateQuestions, quizType]);

    const handleStartNextRound = useCallback(() => {
      clearAutoTimer();
      if (incorrectQueueRef.current.length > 0) {
        queueRef.current = [...incorrectQueueRef.current, ...queueRef.current];
        incorrectQueueRef.current = [];
        incorrectSetRef.current.clear();
      }

      if (queueRef.current.length === 0) {
        setHasNextRound(false);
        setRemainingCount(0);
        setRemainingUniqueCount(0);
        if (onComplete) onComplete();
        return;
      }

      const nextBatch = queueRef.current.splice(0, Math.min(sessionSize, queueRef.current.length));
      currentBatchRef.current = nextBatch;

      setQuestions(generateQuestions(nextBatch, baseWordsRef.current, quizType));
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);
      setCurrentRound(prev => prev + 1);

      const futureRemaining = queueRef.current.length + incorrectQueueRef.current.length;
      setRemainingCount(futureRemaining);
      setRemainingUniqueCount(computeRemainingUniqueCount());
      setHasNextRound(futureRemaining > 0);
    }, [generateQuestions, onComplete, quizType, sessionSize]);


    // Initialize once per dialog open
    useEffect(() => {
      if (!open) {
        initializedRef.current = false;
        clearAutoTimer();
        return;
      }
      if (initializedRef.current) return;

      if (!allowAnyCount && words.length < 4) return;
      const qWords = (questionWords && questionWords.length > 0) ? questionWords : words;
      if (qWords.length === 0) return;

      // Emit vocab_start when quiz opens
      try { activityEmitter.emit('vocab_start', '/vocab'); } catch {}

      setLoading(true);
      const defaultSize = Math.max(1, Math.min(10, qWords.length));
      const chosen = initialSessionSize && initialSessionSize > 0 ? Math.min(initialSessionSize, qWords.length) : defaultSize;
      setSessionSize(chosen);
      seedSession(qWords, chosen);
      setLoading(false);
      initializedRef.current = true;
    }, [open, questionWords, seedSession, words]);

    // Rebuild when quiz type changes using the locked batch
    useEffect(() => {
      if (!initializedRef.current) return;
      clearAutoTimer();
      if (!currentBatchRef.current.length) return;

      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);
      setQuestions(generateQuestions(currentBatchRef.current, baseWordsRef.current, quizType));
    }, [generateQuestions, quizType]);

    // In-quiz session size is fixed from setup dialog; do not allow changing inside quiz

    const handleAnswerSelect = (answer: string) => {
      if (isAnswered) return;
      setSelectedAnswer(answer);

      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      const correct = answer === currentQuestion.correctAnswer;
      setIsAnswered(true);

      if (correct) {
        setScore(prev => prev + 1);
        if (onAnswer) onAnswer(currentQuestion.word.id, true);
        clearAutoTimer();
        const isLast = currentQuestionIndex >= questions.length - 1;
        autoNextTimerRef.current = window.setTimeout(() => {
          if (isLast) {
            finalizeRound();
          } else {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
          }
        }, 1000);
      } else {
        if (onAnswer) onAnswer(currentQuestion.word.id, false);
        clearAutoTimer();
        if (!incorrectSetRef.current.has(currentQuestion.word.id)) {
          incorrectSetRef.current.add(currentQuestion.word.id);
          incorrectQueueRef.current.push(currentQuestion.word);
        }
      }
    };

    const handleNextQuestion = () => {
      clearAutoTimer();
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
      } else {
        finalizeRound();
      }
    };

    const handlePlayAudio = () => {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion?.word.audioUrl) {
            new Audio(currentQuestion.word.audioUrl).play();
        }
    };

    // If we don't have enough words (unless allowed)
    if (!allowAnyCount && words.length < 4) {
        return (
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="sm"
                keepMounted
            >
                <DialogTitle>
                    Quiz Mode
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Not enough words for a quiz
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You need at least 4 vocabulary words to start a quiz. Add more words to your vocabulary list.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            keepMounted
        >
            <DialogTitle>
                Quiz Mode
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {!quizComplete ? (
                    <Box>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                          sx={{ mb: 3 }}
                        >
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Round {currentRound}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Assigned: {totalUniqueWordCount} unique word{totalUniqueWordCount === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              This round: {questions.length} question slot{questions.length === 1 ? '' : 's'}
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Quiz Type Selection */}
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant={quizType === 'translation' ? 'contained' : 'outlined'}
                                onClick={() => setQuizType('translation')}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: quizType === 'translation' ? '#2573ff' : 'transparent',
                                    '&:hover': {
                                        bgcolor: quizType === 'translation' ? '#1a5cd1' : 'rgba(37, 115, 255, 0.1)'
                                    }
                                }}
                            >
                                Translation
                            </Button>
                            <Button
                                variant={quizType === 'definition' ? 'contained' : 'outlined'}
                                onClick={() => setQuizType('definition')}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: quizType === 'definition' ? '#2573ff' : 'transparent',
                                    '&:hover': {
                                        bgcolor: quizType === 'definition' ? '#1a5cd1' : 'rgba(37, 115, 255, 0.1)'
                                    }
                                }}
                            >
                                Definition
                            </Button>
                            <Button
                                variant={quizType === 'listening' ? 'contained' : 'outlined'}
                                onClick={() => setQuizType('listening')}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: quizType === 'listening' ? '#2573ff' : 'transparent',
                                    '&:hover': {
                                        bgcolor: quizType === 'listening' ? '#1a5cd1' : 'rgba(37, 115, 255, 0.1)'
                                    }
                                }}
                                disabled={!questions[currentQuestionIndex]?.word.audioUrl}
                            >
                                Listening
                            </Button>
                        </Box>

                        {/* Progress */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Score: {score}
                            </Typography>
                        </Box>

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            questions.length > 0 && (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentQuestionIndex}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card
                                            elevation={0}
                                            sx={{
                                                mb: 3,
                                                borderRadius: 2,
                                                bgcolor: '#fafbfd',
                                                border: '1px solid rgba(0,0,0,0.08)'
                                            }}
                                        >
                                            <CardContent>
                                                <Box sx={{ mb: 2 }}>
                                                    {quizType === 'listening' ? (
                                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                                            <IconButton
                                                                onClick={handlePlayAudio}
                                                                sx={{
                                                                    bgcolor: 'rgba(37, 115, 255, 0.1)',
                                                                    color: '#2573ff',
                                                                    p: 2,
                                                                    '&:hover': {
                                                                        bgcolor: 'rgba(37, 115, 255, 0.2)'
                                                                    }
                                                                }}
                                                            >
                                                                <VolumeUpIcon fontSize="large" />
                                                            </IconButton>
                                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                                Click to listen and choose the correct word
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <>
                                                            <Typography variant="h6" gutterBottom sx={{ color: '#2573ff', fontWeight: 600 }}>
                                                                {questions[currentQuestionIndex].word.text}
                                                            </Typography>

                                                            {questions[currentQuestionIndex].word.partOfSpeech && (
                                                                <Chip
                                                                    label={questions[currentQuestionIndex].word.partOfSpeech}
                                                                    size="small"
                                                                    sx={{
                                                                        textTransform: 'capitalize',
                                                                        bgcolor: 'rgba(37, 115, 255, 0.1)',
                                                                        color: '#2573ff',
                                                                        mb: 1
                                                                    }}
                                                                />
                                                            )}

                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                {quizType === 'translation' ? 'Choose the correct translation:' : 'Choose the correct definition:'}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>

                                                <FormControl component="fieldset" sx={{ width: '100%' }}>
                                                    <RadioGroup value={selectedAnswer || ''} onChange={(e) => handleAnswerSelect(e.target.value)}>
                                                        {questions[currentQuestionIndex].options.map((option, index) => (
                                                            <FormControlLabel
                                                                key={index}
                                                                value={option}
                                                                control={<Radio />}
                                                                label={option}
                                                                disabled={isAnswered}
                                                                sx={{
                                                                    mb: 1,
                                                                    p: 1,
                                                                    borderRadius: 1,
                                                                    bgcolor: isAnswered
                                                                        ? option === questions[currentQuestionIndex].correctAnswer
                                                                            ? 'rgba(0, 215, 194, 0.1)'
                                                                            : selectedAnswer === option
                                                                                ? 'rgba(255, 72, 66, 0.1)'
                                                                                : 'transparent'
                                                                        : 'transparent',
                                                                    '&:hover': {
                                                                        bgcolor: isAnswered
                                                                            ? option === questions[currentQuestionIndex].correctAnswer
                                                                                ? 'rgba(0, 215, 194, 0.1)'
                                                                                : selectedAnswer === option
                                                                                    ? 'rgba(255, 72, 66, 0.1)'
                                                                                    : 'rgba(0,0,0,0.04)'
                                                                            : 'rgba(0,0,0,0.04)'
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                    </RadioGroup>
                                                </FormControl>
                                            </CardContent>
                                        </Card>

                                        {isAnswered && (
                                            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: selectedAnswer === questions[currentQuestionIndex].correctAnswer ? 'rgba(0, 215, 194, 0.1)' : 'rgba(255, 72, 66, 0.1)' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    {selectedAnswer === questions[currentQuestionIndex].correctAnswer ? (
                                                        <>
                                                            <CheckCircleOutlineIcon sx={{ color: '#00d7c2' }} />
                                                            <Typography sx={{ color: '#00d7c2', fontWeight: 500 }}>
                                                                Correct!
                                                            </Typography>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <HighlightOffIcon sx={{ color: theme.palette.error.main }} />
                                                            <Typography sx={{ color: theme.palette.error.main, fontWeight: 500 }}>
                                                                Incorrect
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>

                                                {selectedAnswer !== questions[currentQuestionIndex].correctAnswer && (
                                                    <Typography variant="body2">
                                                        The correct answer is: <strong>{questions[currentQuestionIndex].correctAnswer}</strong>
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            )
                        )}
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <EmojiEventsIcon sx={{ fontSize: 60, color: score > questions.length / 2 ? '#FFD700' : 'rgba(0,0,0,0.2)', mb: 2 }} />

                            <Typography variant="h5" gutterBottom>
                                Quiz Complete!
                            </Typography>

                            <Typography variant="h6" gutterBottom sx={{ color: score > questions.length / 2 ? '#00d7c2' : theme.palette.text.secondary }}>
                                Your score: {score} / {questions.length}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Round {currentRound} complete.
                            </Typography>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {hasNextRound
                                    ? `Great work! ${remainingUniqueCount} unique word${remainingUniqueCount === 1 ? '' : 's'} are waiting for the next round.`
                                    : 'Fantastic! You practiced every assigned word for this homework.'}
                            </Typography>
                            {hasNextRound && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                                Hint: {remainingCount} total question slot{remainingCount === 1 ? '' : 's'} remaining
                              </Typography>
                            )}
                        </motion.div>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
              {!quizComplete ? (
                <>
                  <Button onClick={onClose} color="inherit">
                    Exit Quiz
                  </Button>

                  {isAnswered && selectedAnswer !== questions[currentQuestionIndex]?.correctAnswer && (
                    <Button
                      onClick={handleNextQuestion}
                      variant="contained"
                      sx={{
                        borderRadius: 2,
                        bgcolor: '#2573ff',
                        '&:hover': { bgcolor: '#1a5cd1' }
                      }}
                    >
                      {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={onClose} color="inherit">
                    Close
                  </Button>
                  {hasNextRound && (
                    <Button
                      onClick={handleStartNextRound}
                      variant="contained"
                      sx={{
                        borderRadius: 2,
                        bgcolor: '#2573ff',
                        '&:hover': { bgcolor: '#1a5cd1' }
                      }}
                    >
                      Learn remaining words{remainingUniqueCount > 0 ? ` (${remainingUniqueCount})` : ''}
                    </Button>
                  )}
                  <Button
                    onClick={handleRetryCurrentRound}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: '#2573ff',
                      color: '#2573ff',
                      '&:hover': { borderColor: '#1a5cd1', color: '#1a5cd1' }
                    }}
                  >
                    Review this round again
                  </Button>
                </>
              )}
            </DialogActions>
        </Dialog>
    );
};

export default QuizMode;