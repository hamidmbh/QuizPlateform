import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { studentApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Quiz, Submission, Option } from '@/types/quiz';

export function QuizTaking() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]); // Support multiple selections
  const [answers, setAnswers] = useState<Record<string, string[]>>({}); // questionId -> optionId[]
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false); // Prevent multiple auto-submissions
  const autoSubmitAttemptedRef = useRef(false); // Ref to track if we've attempted auto-submit (persists across renders)

  // Fetch quiz from student quizzes list
  const { data: quizzesData, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ['studentQuizzes'],
    queryFn: async () => {
      const quizzes = await studentApi.getQuizzes();
      // Map backend format to frontend format
      return quizzes.map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description || '',
        questions: (q.questions || []).map((question: any) => ({
          id: question.id,
          text: question.text,
          options: (question.options || []).map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          })),
        })),
        durationMinutes: q.durationMinutes,
        classId: q.classId || q.class_id,
        openAt: q.openAt || q.open_at,
        closeAt: q.closeAt || q.close_at,
        createdBy: q.createdBy || q.created_by,
        createdAt: q.createdAt || q.created_at,
      }));
    },
    enabled: !!user && !!quizId,
  });

  const quiz: Quiz | undefined = quizzesData?.find((q: any) => String(q.id) === String(quizId));

  // Start quiz mutation
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizId) throw new Error('Quiz ID is required');
      const response = await studentApi.startQuiz(quizId);
      return response.submission;
    },
    onSuccess: (submissionData: any) => {
      setSubmission(submissionData);
      
      // Handle backend response format (snake_case: expires_at or camelCase: expiresAt)
      const expiresAtValue = submissionData.expiresAt || submissionData.expires_at;
      
      // Ensure expiresAt is a valid Date object - handle both string and Date
      let expires: Date;
      if (expiresAtValue instanceof Date) {
        expires = expiresAtValue;
      } else if (typeof expiresAtValue === 'string') {
        expires = new Date(expiresAtValue);
      } else {
        // Fallback: calculate from started_at + duration
        const startedAtValue = submissionData.startedAt || submissionData.started_at;
        const startedAt = startedAtValue instanceof Date 
          ? startedAtValue 
          : new Date(startedAtValue);
        const quiz = quizzesData?.find((q: any) => String(q.id) === String(quizId));
        const durationMinutes = quiz?.durationMinutes || 15;
        expires = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
      }
      
      // Validate the date
      if (isNaN(expires.getTime())) {
        console.error('Invalid expiresAt date:', expiresAtValue);
        // Fallback to current time + duration
        const quiz = quizzesData?.find((q: any) => String(q.id) === String(quizId));
        const durationMinutes = quiz?.durationMinutes || 15;
        expires = new Date(Date.now() + durationMinutes * 60 * 1000);
      }
      
      setExpiresAt(expires);
      
      // Initialize timer immediately when quiz starts (each student's timer starts when they enter)
      const now = new Date();
      const diff = Math.max(0, expires.getTime() - now.getTime());
      const initialSeconds = Math.floor(diff / 1000);
      setTimeLeft(isNaN(initialSeconds) || initialSeconds < 0 ? 0 : initialSeconds);
      
      // Initialize answers object - get quiz from query data
      // Don't pre-populate with empty arrays - let them be created when student selects answers
      // This prevents the issue where empty arrays are stored and answers appear to exist but are empty
      const currentQuiz = quizzesData?.find((q: any) => String(q.id) === String(quizId));
      const initialAnswers: Record<string, string[]> = {};
      // Only initialize if we have existing answers from a previous attempt
      // Otherwise, start with empty object - answers will be added when student selects options
      setAnswers(initialAnswers);
    },
    onError: (error: any) => {
      console.error('Failed to start quiz:', error);
      alert('Erreur lors du démarrage du quiz: ' + (error.message || 'Erreur inconnue'));
      navigate('/dashboard');
    },
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (answersToSubmit: Array<{ questionId: string; optionId: string }>) => {
      if (!quizId) throw new Error('Quiz ID is required');
      return await studentApi.submitQuiz(quizId, answersToSubmit);
    },
    onSuccess: () => {
      // Don't show score to student
      setIsFinished(true);
      setHasAutoSubmitted(false); // Reset flag
      // Invalidate queries to refresh quiz status
      queryClient.invalidateQueries({ queryKey: ['studentQuizzes'] });
    },
    onError: (error: any) => {
      console.error('Failed to submit quiz:', error);
      setHasAutoSubmitted(false); // Reset flag on error
      alert('Erreur lors de la soumission: ' + (error.message || 'Erreur inconnue'));
    },
  });

  // Start quiz when component mounts and quiz is loaded
  useEffect(() => {
    if (quiz && quiz.questions && quiz.questions.length > 0 && !submission && !startQuizMutation.isPending && !startQuizMutation.isSuccess) {
      startQuizMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, submission]);

  // Timer based on expiresAt - starts when student enters the quiz (each student has their own timer)
  useEffect(() => {
    if (!expiresAt || isFinished || !submission) return;

    const updateTimer = () => {
      const now = new Date();
      let expires: Date;
      
      if (expiresAt instanceof Date) {
        expires = expiresAt;
      } else if (typeof expiresAt === 'string') {
        expires = new Date(expiresAt);
      } else {
        return; // Invalid expiresAt
      }
      
      // Validate the date
      if (isNaN(expires.getTime())) {
        console.error('Invalid expiresAt date in timer:', expiresAt);
        return;
      }
      
      const diff = Math.max(0, expires.getTime() - now.getTime());
      const seconds = Math.floor(diff / 1000);
      const validSeconds = isNaN(seconds) || seconds < 0 ? 0 : seconds;
      setTimeLeft(validSeconds);
      
      // Note: Auto-submit is handled by a separate useEffect that watches timeLeft
    };

    // Initial update immediately when timer starts
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isFinished, submission]);

  // Separate effect to handle auto-submit when time reaches 0
  useEffect(() => {
    // Only proceed if time has expired and we haven't already submitted or attempted
    if (timeLeft <= 0 && expiresAt && !isFinished && !hasAutoSubmitted && !autoSubmitAttemptedRef.current && quiz && submission) {
      // Double-check: if we've already attempted, don't try again (race condition protection)
      if (autoSubmitAttemptedRef.current) {
        return;
      }
      
      if (submitQuizMutation.isPending) return;
      
      // Set flag IMMEDIATELY before any async operations to prevent race conditions
      autoSubmitAttemptedRef.current = true;
      setHasAutoSubmitted(true);
      
      // Auto-submit with current answers (even if empty)
      const answersToSubmit: Array<{ questionId: string; optionId: string }> = [];
      
      // Normalize all answer keys first to handle type mismatches
      const normalizedAnswers = new Map<string, string[]>();
      Object.entries(answers).forEach(([key, value]) => {
        const normalizedKey = String(key);
        // Include all entries, even if empty (to preserve the key for lookup)
        // If key already exists, merge arrays (but keep empty arrays too)
        const existing = normalizedAnswers.get(normalizedKey);
        if (existing) {
          // Merge non-empty values
          const merged = value && value.length > 0 
            ? [...new Set([...existing, ...value])]
            : existing.length > 0 ? existing : (value || []);
          normalizedAnswers.set(normalizedKey, merged);
        } else {
          // Set the value (even if empty) so we know the key exists
          normalizedAnswers.set(normalizedKey, value || []);
        }
      });
      
      // Collect answers for each question (unanswered = not in payload = 0 points on backend)
      quiz.questions.forEach((q) => {
        const questionIdStr = String(q.id);
        let selectedOptions =
          normalizedAnswers.get(questionIdStr) ??
          answers[questionIdStr] ??
          answers[q.id] ??
          answers[Number(q.id)] ??
          [];

        selectedOptions.forEach((optionId) => {
          if (optionId) {
            answersToSubmit.push({
              questionId: questionIdStr,
              optionId: String(optionId),
            });
          }
        });
      });
      
      const matchedQuestionIds = quiz.questions.map((q) => String(q.id));
      const unmatchedKeys = Array.from(normalizedAnswers.keys()).filter((key) => !matchedQuestionIds.includes(key));
      unmatchedKeys.forEach((key) => {
        const selectedOptions = normalizedAnswers.get(key) ?? [];
        selectedOptions.forEach((optionId) => {
          if (optionId) {
            answersToSubmit.push({ questionId: key, optionId: String(optionId) });
          }
        });
      });

      // Submit when time expired; unanswered questions are not in payload → 0 points on backend
      submitQuizMutation.mutate(answersToSubmit, {
        onError: () => {
          autoSubmitAttemptedRef.current = false;
          setHasAutoSubmitted(false);
        },
      });
    }
  }, [timeLeft, expiresAt, isFinished, hasAutoSubmitted, quiz, submission, answers]);

  /** Set option selected state (add or remove) - use this to avoid double-toggle from checkbox + div click */
  const handleOptionChange = (optionId: string, selected: boolean) => {
    if (!quiz || isFinished || timeLeft <= 0) return;
    const question = quiz.questions[currentQuestion];
    if (!question) return;

    const questionIdStr = String(question.id);
    const currentAnswers = answers[questionIdStr] ?? answers[String(question.id)] ?? [];

    const optionIdStr = String(optionId);
    const newAnswers = selected
      ? (currentAnswers.includes(optionIdStr) ? currentAnswers : [...currentAnswers, optionIdStr])
      : currentAnswers.filter((id) => String(id) !== optionIdStr);

    setSelectedOptionIds(newAnswers);
    setAnswers((prev) => ({
      ...prev,
      [questionIdStr]: newAnswers,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
      const nextQuestion = quiz?.questions[currentQuestion + 1];
      if (nextQuestion) {
        const nextIdStr = String(nextQuestion.id);
        setSelectedOptionIds(answers[nextIdStr] ?? answers[nextQuestion.id] ?? []);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      const prevQuestion = quiz?.questions[currentQuestion - 1];
      if (prevQuestion) {
        const prevIdStr = String(prevQuestion.id);
        setSelectedOptionIds(answers[prevIdStr] ?? answers[prevQuestion.id] ?? []);
      }
    }
  };

  const handleSubmit = useCallback(() => {
    if (!quiz || isFinished || submitQuizMutation.isPending) return;

    // Convert answers to API format - support multiple options per question
    const answersToSubmit: Array<{ questionId: string; optionId: string }> = [];
    quiz.questions.forEach(q => {
      // Try both string and number ID formats to handle type mismatches (same as auto-submit)
      const questionIdStr = String(q.id);
      const selectedOptions = answers[questionIdStr] || answers[q.id] || [];
      selectedOptions.forEach(optionId => {
        if (optionId) {
          answersToSubmit.push({
            questionId: questionIdStr,
            optionId: String(optionId),
          });
        }
      });
    });

    if (answersToSubmit.length === 0) {
      if (!confirm('Vous n\'avez répondu à aucune question. Voulez-vous quand même soumettre ?')) {
        return;
      }
    }

    submitQuizMutation.mutate(answersToSubmit);
  }, [quiz, answers, isFinished, submitQuizMutation]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync selected options display when question changes
  useEffect(() => {
    if (quiz?.questions[currentQuestion]) {
      const question = quiz.questions[currentQuestion];
      const questionIdStr = String(question.id);
      setSelectedOptionIds(answers[questionIdStr] ?? answers[question.id] ?? []);
    }
  }, [currentQuestion, quiz, answers]);

  // Loading state
  if (isLoadingQuiz || startQuizMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  // Quiz not found
  if (!isLoadingQuiz && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">Quiz non trouvé</p>
            <p className="text-sm text-muted-foreground mb-4">
              Le quiz que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="mt-4"
              variant="outline"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if quiz has questions
  if (quiz && (!quiz.questions || quiz.questions.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">Quiz invalide</p>
            <p className="text-sm text-muted-foreground mb-4">
              Ce quiz n'a pas de questions.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="mt-4"
              variant="outline"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Finished state
  if (isFinished) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <CardTitle className="font-display text-2xl">Quiz terminé !</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vos réponses ont été enregistrées avec succès.
              </p>
              <p className="text-sm text-muted-foreground">
                Votre professeur vous communiquera les résultats.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="gradient-primary text-primary-foreground w-full"
              >
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isTimeWarning = timeLeft < 60;
  const answeredCount = Object.values(answers).filter(a => a && a.length > 0).length;

  return (
    <div className="min-h-screen gradient-hero p-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground">
              Question {currentQuestion + 1} sur {quiz.questions.length}
            </p>
          </div>
          {expiresAt ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isTimeWarning ? 'bg-destructive/20 text-destructive animate-pulse-soft' : 'bg-primary/20 text-primary'
            }`}>
              {isTimeWarning ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold">--:--</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-8 h-2" />

        {/* Question Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                {question.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option: Option) => {
                const optionIdStr = String(option.id);
                const isSelected =
                  selectedOptionIds.includes(optionIdStr) ||
                  selectedOptionIds.some((id) => String(id) === optionIdStr);
                return (
                  <div
                    key={option.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button[role="checkbox"]')) {
                        return;
                      }
                      if (!isFinished && timeLeft > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOptionChange(optionIdStr, !isSelected);
                      }
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    } ${isFinished || timeLeft <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (isFinished || timeLeft <= 0) return;
                          handleOptionChange(optionIdStr, checked === true);
                        }}
                        disabled={isFinished || timeLeft <= 0}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                      }`}>
                        {String.fromCharCode(65 + question.options.indexOf(option))}
                      </div>
                      <span className="flex-1">{option.text}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestion === 0}
          >
            Précédent
          </Button>
          {currentQuestion === quiz.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              className="gradient-primary text-primary-foreground"
              disabled={submitQuizMutation.isPending || isFinished || timeLeft <= 0}
            >
              {submitQuizMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Soumission...
                </>
              ) : timeLeft <= 0 && !isFinished ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Soumission automatique...
                </>
              ) : (
                'Terminer'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="gradient-primary text-primary-foreground"
            >
              Suivant
            </Button>
          )}
        </div>

        {/* Question indicators */}
        <div className="flex justify-center gap-2 mt-8 flex-wrap">
          {quiz.questions.map((q, index) => {
            const qIdStr = String(q.id);
            const isAnswered = (answers[qIdStr] ?? answers[q.id])?.length > 0;
            const isCurrent = index === currentQuestion;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestion(index);
                  setSelectedOptionIds(answers[qIdStr] ?? answers[q.id] ?? []);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-primary scale-125'
                    : isAnswered
                    ? 'bg-primary/50'
                    : 'bg-border'
                }`}
                title={`Question ${index + 1}${isAnswered ? ' (répondu)' : ''}`}
              />
            );
          })}
        </div>

        {/* Answer count */}
        <div className="text-center mt-4 text-sm text-muted-foreground">
          {answeredCount} / {quiz.questions.length} questions répondues
        </div>
      </div>
    </div>
  );
}
