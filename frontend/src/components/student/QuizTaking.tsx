import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuiz } from '@/contexts/QuizContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export function QuizTaking() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quizzes, addAttempt, getAttemptsByStudent } = useQuiz();

  const quiz = quizzes.find(q => q.id === quizId);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (quiz) {
      setTimeLeft(quiz.timeLimit * 60);
      setAnswers(new Array(quiz.questions.length).fill(-1));
    }
  }, [quiz]);

  const finishQuiz = useCallback(() => {
    if (!quiz || !user || isFinished) return;

    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        correctAnswers++;
      }
    });
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);

    // Save attempt
    addAttempt({
      id: `attempt-${Date.now()}`,
      quizId: quiz.id,
      studentId: user.id,
      answers,
      completedAt: new Date().toISOString(),
      score,
    });

    setIsFinished(true);
  }, [quiz, user, answers, isFinished, addAttempt]);

  useEffect(() => {
    if (timeLeft <= 0 && quiz && !isFinished) {
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quiz, isFinished, finishQuiz]);

  // Check if already completed
  useEffect(() => {
    if (user && quizId) {
      const attempts = getAttemptsByStudent(user.id);
      const hasCompleted = attempts.some(a => a.quizId === quizId);
      if (hasCompleted) {
        navigate('/dashboard');
      }
    }
  }, [user, quizId, getAttemptsByStudent, navigate]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Quiz non trouvé</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = selectedAnswer;
      setAnswers(newAnswers);
    }

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(answers[currentQuestion + 1] !== -1 ? answers[currentQuestion + 1] : null);
    } else {
      // Update last answer before finishing
      const finalAnswers = [...answers];
      if (selectedAnswer !== null) {
        finalAnswers[currentQuestion] = selectedAnswer;
      }
      
      // Calculate and submit
      let correctAnswers = 0;
      quiz.questions.forEach((q, i) => {
        if (finalAnswers[i] === q.correctAnswer) {
          correctAnswers++;
        }
      });
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);

      addAttempt({
        id: `attempt-${Date.now()}`,
        quizId: quiz.id,
        studentId: user!.id,
        answers: finalAnswers,
        completedAt: new Date().toISOString(),
        score,
      });

      setIsFinished(true);
    }
  };

  const handlePrevQuestion = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = selectedAnswer;
      setAnswers(newAnswers);
    }

    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestion - 1] !== -1 ? answers[currentQuestion - 1] : null);
    }
  };

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isTimeWarning = timeLeft < 60;

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
                Vos réponses ont été enregistrées. Votre professeur vous communiquera votre note.
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
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isTimeWarning ? 'bg-destructive/20 text-destructive animate-pulse-soft' : 'bg-primary/20 text-primary'
          }`}>
            {isTimeWarning ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>
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
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAnswer === index
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      selectedAnswer === index
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
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
          <Button
            onClick={handleNextQuestion}
            className="gradient-primary text-primary-foreground"
            disabled={selectedAnswer === null}
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Terminer' : 'Suivant'}
          </Button>
        </div>

        {/* Question indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (selectedAnswer !== null) {
                  const newAnswers = [...answers];
                  newAnswers[currentQuestion] = selectedAnswer;
                  setAnswers(newAnswers);
                }
                setCurrentQuestion(index);
                setSelectedAnswer(answers[index] !== -1 ? answers[index] : null);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-primary scale-125'
                  : answers[index] !== -1
                  ? 'bg-primary/50'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
