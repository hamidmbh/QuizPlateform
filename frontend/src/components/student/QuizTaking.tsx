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
      
      // If mutation is already in progress, don't trigger again (wait for it to complete)
      if (submitQuizMutation.isPending) {
        console.log('⏳ Submission already in progress, skipping auto-submit trigger');
        return;
      }
      
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
      
      console.log('📋 Normalized answers map:', Array.from(normalizedAnswers.entries()));
      console.log('📋 Raw answers object:', answers);
      console.log('📋 All answer keys:', Object.keys(answers));
      console.log('📋 All answer entries:', Object.entries(answers));
      
      // Iterate through all questions and collect answers
      quiz.questions.forEach(q => {
        const questionIdStr = String(q.id);
        // Try normalized map first, then fallback to direct access with both formats
        // Check the raw answers object directly since normalization might filter empty arrays
        let selectedOptions = normalizedAnswers.get(questionIdStr);
        if (!selectedOptions) {
          // Try direct access with multiple formats - check raw answers object
          selectedOptions = answers[questionIdStr] 
            || answers[q.id] 
            || answers[Number(q.id)]
            || answers[String(q.id)]
            || [];
        }
        
        // Log what we found
        if (selectedOptions && selectedOptions.length > 0) {
          console.log(`✅ Found ${selectedOptions.length} answer(s) for question ${questionIdStr}:`, selectedOptions);
        } else {
          // Check if the key exists but array is empty
          const keyExists = answers[questionIdStr] !== undefined || answers[q.id] !== undefined;
          if (keyExists) {
            const emptyValue = answers[questionIdStr] || answers[q.id];
            console.log(`⚠️ Answer key exists for question ${questionIdStr} but array is empty:`, emptyValue);
            console.log(`   This means the answer was cleared or never properly set.`);
          } else {
            console.log(`❌ No answer key found for question ${questionIdStr} (tried: ${questionIdStr}, ${q.id}, ${Number(q.id)})`);
            // Debug: show what keys exist vs what we're looking for
            console.log(`   Available keys:`, Object.keys(answers));
            console.log(`   Looking for:`, questionIdStr, `(type: ${typeof questionIdStr})`);
            console.log(`   Question ID types:`, { str: questionIdStr, num: q.id, numStr: String(q.id) });
          }
        }
        
        selectedOptions.forEach(optionId => {
          if (optionId) {
            answersToSubmit.push({
              questionId: questionIdStr,
              optionId: String(optionId),
            });
          }
        });
      });
      
      // Also check if there are any answers in the answers object that weren't matched
      const allAnswerKeys = Array.from(normalizedAnswers.keys());
      const matchedQuestionIds = quiz.questions.map(q => String(q.id));
      const unmatchedKeys = allAnswerKeys.filter(key => !matchedQuestionIds.includes(key));
      if (unmatchedKeys.length > 0) {
        console.warn('⚠️ Found answers with unmatched question IDs:', unmatchedKeys);
        // Try to submit these anyway
        unmatchedKeys.forEach(key => {
          const selectedOptions = normalizedAnswers.get(key) || [];
          selectedOptions.forEach(optionId => {
            if (optionId) {
              answersToSubmit.push({
                questionId: key,
                optionId: String(optionId),
              });
            }
          });
        });
      }
      
      console.log('⏰ Time expired! Auto-submitting quiz...', {
        timeLeft,
        isFinished,
        hasAutoSubmitted,
        quizId: quiz.id,
        submissionId: submission.id,
        answersObject: answers,
        answersKeys: Object.keys(answers),
        answersEntries: Object.entries(answers),
        normalizedAnswersMap: Array.from(normalizedAnswers.entries()),
        quizQuestionIds: quiz.questions.map(q => ({ id: q.id, idStr: String(q.id), idNum: Number(q.id) })),
        answersCount: Object.keys(answers).length,
        answersToSubmitCount: answersToSubmit.length,
        isPending: submitQuizMutation.isPending
      });
      
      console.log('📤 Submitting', answersToSubmit.length, 'answer(s)...', answersToSubmit);
      
      // Submit even if no answers (time expired)
      submitQuizMutation.mutate(answersToSubmit, {
        onError: (error) => {
          console.error('❌ Auto-submit failed:', error);
          // Reset flags on error so user can try again
          autoSubmitAttemptedRef.current = false;
          setHasAutoSubmitted(false);
        },
        onSuccess: () => {
          console.log('✅ Auto-submit successful!');
        }
      });
    }
  }, [timeLeft, expiresAt, isFinished, hasAutoSubmitted, quiz, submission, answers]);

  const handleToggleOption = (optionId: string) => {
    if (!quiz || isFinished || timeLeft <= 0) return;
    const question = quiz.questions[currentQuestion];
    if (!question) return;
    
    // Use string ID consistently to avoid type mismatch issues
    const questionIdStr = String(question.id);
    // Try both formats when reading to handle existing data
    const currentAnswers = answers[questionIdStr] || answers[question.id] || [];
    
    const newAnswers = currentAnswers.includes(optionId)
      ? currentAnswers.filter(id => id !== optionId)
      : [...currentAnswers, optionId];
    
    console.log(`📝 Toggling option ${optionId} for question ${questionIdStr}:`, {
      currentAnswers,
      newAnswers,
      questionId: question.id,
      questionIdStr
    });
    
    setSelectedOptionIds(newAnswers);
    setAnswers(prev => {
      const updated = { ...prev };
      // Store with string ID for consistency
      updated[questionIdStr] = newAnswers;
      // Remove number format if it exists to avoid duplicates
      if (question.id !== questionIdStr && updated[question.id]) {
        delete updated[question.id];
      }
      console.log('📝 Updated answers object:', updated);
      return updated;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
      const nextQuestion = quiz?.questions[currentQuestion + 1];
      if (nextQuestion) {
        setSelectedOptionIds(answers[nextQuestion.id] || []);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      const prevQuestion = quiz?.questions[currentQuestion - 1];
      if (prevQuestion) {
        setSelectedOptionIds(answers[prevQuestion.id] || []);
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

  // Update selected options when question changes
  useEffect(() => {
    if (quiz && quiz.questions[currentQuestion]) {
      const question = quiz.questions[currentQuestion];
      setSelectedOptionIds(answers[question.id] || []);
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
                const isSelected = selectedOptionIds.includes(option.id);
                return (
                  <div
                    key={option.id}
                    onClick={(e) => {
                      // Only handle click if not clicking on checkbox (checkbox handles its own)
                      if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                        if (!isFinished && timeLeft > 0) {
                          console.log('🖱️ Option div clicked (outside checkbox):', option.id);
                          handleToggleOption(option.id);
                        }
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
                        onCheckedChange={() => {
                          console.log('☑️ Checkbox toggled for option:', option.id);
                          handleToggleOption(option.id);
                        }}
                        disabled={isFinished || timeLeft <= 0}
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
            const isAnswered = answers[q.id] && answers[q.id].length > 0;
            const isCurrent = index === currentQuestion;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestion(index);
                  setSelectedOptionIds(answers[q.id] || []);
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
