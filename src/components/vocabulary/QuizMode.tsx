import React, { useState, useEffect, useRef } from 'react';
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
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { VocabularyWord } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizModeProps {
    open: boolean;
    onClose: () => void;
    words: VocabularyWord[];
    // Optional: limit which words are asked as questions; full words pool remains for answer options
    questionWords?: VocabularyWord[];
    // Optional callbacks for integration (e.g., homework progress)
    onAnswer?: (wordId: string, correct: boolean) => void;
    onComplete?: () => void;
}

type QuizType = 'translation' | 'definition' | 'listening';
type QuizQuestion = {
    word: VocabularyWord;
    options: string[];
    correctAnswer: string;
    type: QuizType;
};

const QuizMode: React.FC<QuizModeProps> = ({ open, onClose, words, questionWords, onAnswer, onComplete }) => {
    const theme = useTheme();
    const [quizType, setQuizType] = useState<QuizType>('translation');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [loading, setLoading] = useState(false);

    // Lock the question pool per dialog open to avoid resets on parent re-renders
    const sessionWordsRef = useRef<VocabularyWord[]>([]);
    const initializedRef = useRef(false);

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
        clearAutoTimer();
      };
    }, []);

    // Initialize once per dialog open
    useEffect(() => {
      if (!open) {
        initializedRef.current = false; // allow re-init on the next open
        clearAutoTimer();
        return;
      }
      if (initializedRef.current) return;

      if (words.length < 4) return; // handled by "not enough words" UI path
      const qWords = (questionWords && questionWords.length > 0) ? questionWords : words;
      if (qWords.length === 0) return;

      setLoading(true);

      // Reset quiz state for a fresh session
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);

      // Lock the base pool for this session
      sessionWordsRef.current = qWords.slice();

      // Build questions once for this open
      const newQuestions = generateQuestions(sessionWordsRef.current, words, quizType);
      setQuestions(newQuestions);

      setLoading(false);
      initializedRef.current = true;
    }, [open]);

    // If user switches quiz type, rebuild from the locked pool (no parent-driven resets)
    useEffect(() => {
      if (!initializedRef.current) return;
      clearAutoTimer();

      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);

      const base = sessionWordsRef.current.length
        ? sessionWordsRef.current
        : ((questionWords && questionWords.length > 0) ? questionWords : words);

      setQuestions(generateQuestions(base, words, quizType));
    }, [quizType]);

    const generateQuestions = (wordList: VocabularyWord[], poolForOptions: VocabularyWord[], type: QuizType): QuizQuestion[] => {
        // Shuffle words and take up to 10
        const shuffledWords = [...wordList].sort(() => Math.random() - 0.5).slice(0, 10);

        return shuffledWords.map(word => {
            // Get 3 random incorrect options
            const incorrectOptions = poolForOptions
                .filter(w => w.id !== word.id)
                .sort(() => Math.random() - 0.5)
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

            // Shuffle options
            options = options.sort(() => Math.random() - 0.5);

            return {
                word,
                options,
                correctAnswer,
                type
            };
        });
    };

    const handleAnswerSelect = (answer: string) => {
      setSelectedAnswer(answer);

      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      const correct = answer === currentQuestion.correctAnswer;

      // Lock selection and evaluate immediately
      setIsAnswered(true);

      if (correct) {
        setScore(prev => prev + 1);
        if (onAnswer) onAnswer(currentQuestion.word.id, true);

        // Auto-advance after 3 seconds
        clearAutoTimer();
        autoNextTimerRef.current = window.setTimeout(() => {
          setCurrentQuestionIndex(prevIdx => {
            const isLast = prevIdx >= questions.length - 1;
            if (isLast) {
              setQuizComplete(true);
              if (onComplete) onComplete();
              return prevIdx;
            }
            return prevIdx + 1;
          });
          setSelectedAnswer(null);
          setIsAnswered(false);
        }, 1000);
      } else {
        // Incorrect – no auto-advance; wait for user to click "Next"
        if (onAnswer) onAnswer(currentQuestion.word.id, false);
        clearAutoTimer();
      }
    };

    // (handleCheckAnswer deleted)

    const handleNextQuestion = () => {
      clearAutoTimer();
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
      } else {
        setQuizComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    };

    const handleRestartQuiz = () => {
      const base = sessionWordsRef.current.length
        ? sessionWordsRef.current
        : ((questionWords && questionWords.length > 0) ? questionWords : words);
      const newQuestions = generateQuestions(base, words, quizType);
      setQuestions(newQuestions);

      // Reset quiz state
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizComplete(false);
    };

    const handlePlayAudio = () => {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion?.word.audioUrl) {
            new Audio(currentQuestion.word.audioUrl).play();
        }
    };

    // If we don't have enough words
    if (words.length < 4) {
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

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {score === questions.length
                                    ? 'Perfect! You got all answers correct.'
                                    : score > questions.length / 2
                                        ? 'Good job! Keep practicing to improve your vocabulary.'
                                        : 'Keep practicing to improve your vocabulary skills.'}
                            </Typography>
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
                  <Button
                    onClick={handleRestartQuiz}
                    variant="contained"
                    sx={{
                      borderRadius: 2,
                      bgcolor: '#2573ff',
                      '&:hover': { bgcolor: '#1a5cd1' }
                    }}
                  >
                    Try Again
                  </Button>
                </>
              )}
            </DialogActions>
        </Dialog>
    );
};

export default QuizMode;