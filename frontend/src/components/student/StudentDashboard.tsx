import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, BookOpen, CheckCircle, XCircle, LogOut, AlertCircle } from 'lucide-react';
import { studentApi } from '@/services/api';
import { Quiz } from '@/types/quiz';

// Helper to convert backend quiz format to frontend format
const mapQuizFromBackend = (backendQuiz: any): Quiz & { submissionStatus?: string } => {
  return {
    id: backendQuiz.id,
    title: backendQuiz.title,
    description: backendQuiz.description || '',
    questions: backendQuiz.questions || [],
    durationMinutes: backendQuiz.durationMinutes || backendQuiz.duration_minutes,
    classId: backendQuiz.classId || backendQuiz.class_id,
    openAt: backendQuiz.openAt || backendQuiz.open_at,
    closeAt: backendQuiz.closeAt || backendQuiz.close_at,
    createdBy: backendQuiz.createdBy || backendQuiz.created_by,
    createdAt: backendQuiz.createdAt || backendQuiz.created_at,
    submissionStatus: backendQuiz.submissionStatus || backendQuiz.submission_status, // Preserve submission status
  };
};

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch quizzes from API
  const { data: quizzesData, isLoading, error, refetch } = useQuery({
    queryKey: ['studentQuizzes'],
    queryFn: async () => {
      const quizzes = await studentApi.getQuizzes();
      return quizzes.map(mapQuizFromBackend);
    },
    enabled: !!user && user.role === 'STUDENT',
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Refetch quizzes when component becomes visible (user returns from quiz)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  const studentQuizzes = quizzesData || [];
  
  // Extract quiz statuses from submissions
  const quizStatuses: Record<string, 'completed' | 'late' | 'pending' | 'in_progress'> = {};
  if (quizzesData) {
    const now = new Date();
    quizzesData.forEach((quiz: any) => {
      const closeDate = new Date(quiz.closeAt || quiz.close_at);
      const isLate = now > closeDate;
      
      if (quiz.submissionStatus === 'completed') {
        quizStatuses[String(quiz.id)] = 'completed';
      } else if (quiz.submissionStatus === 'in_progress') {
        quizStatuses[String(quiz.id)] = 'in_progress';
      } else if (isLate) {
        quizStatuses[String(quiz.id)] = 'late';
      } else {
        quizStatuses[String(quiz.id)] = 'pending';
      }
    });
  }
  
  const completedQuizIds = Object.keys(quizStatuses).filter(id => quizStatuses[id] === 'completed');

  if (!user || user.role !== 'STUDENT') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Erreur lors du chargement des quiz</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-xl">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-gradient">QuizMaster</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden sm:inline">
              Bienvenue, <span className="text-foreground font-medium">{user.name}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Bienvenue, <span className="text-foreground font-medium">{user.name}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{studentQuizzes.length}</p>
                    <p className="text-muted-foreground text-sm">Quiz disponibles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedQuizIds.length}</p>
                    <p className="text-muted-foreground text-sm">Quiz terminés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{studentQuizzes.length - completedQuizIds.length}</p>
                    <p className="text-muted-foreground text-sm">Quiz en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quiz List */}
          <h2 className="font-display text-xl font-semibold mb-4">Mes Quiz</h2>
          
          {studentQuizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun quiz disponible pour le moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentQuizzes.map((quiz, index) => {
                const status = quizStatuses[quiz.id] || 'pending';
                const isCompleted = status === 'completed';
                const isLate = status === 'late';
                const isInProgress = status === 'in_progress';
                
                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-display text-lg">{quiz.title}</CardTitle>
                            <CardDescription className="mt-1">{quiz.description}</CardDescription>
                          </div>
                          {isCompleted ? (
                            <Badge className="bg-success/20 text-success hover:bg-success/30 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : isLate ? (
                            <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-0">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Late
                            </Badge>
                          ) : isInProgress ? (
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              In Progress
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              À faire
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {quiz.questions.length} questions
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {quiz.durationMinutes} min
                          </div>
                        </div>
                        
                        {isCompleted ? (
                          <Button variant="outline" className="w-full" disabled>
                            Quiz terminé
                          </Button>
                        ) : isLate ? (
                          <Button variant="outline" className="w-full" disabled>
                            Quiz fermé
                          </Button>
                        ) : (
                          <Link to={`/quiz/${quiz.id}`}>
                            <Button className="w-full gradient-primary text-primary-foreground">
                              {isInProgress ? 'Continuer le quiz' : 'Commencer le quiz'}
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
