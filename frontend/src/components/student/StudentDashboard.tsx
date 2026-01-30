import { useAuth } from '@/contexts/AuthContext';
import { useQuiz } from '@/contexts/QuizContext';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, BookOpen, CheckCircle, XCircle, LogOut } from 'lucide-react';

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const { quizzes, getAttemptsByStudent, classes } = useQuiz();
  const navigate = useNavigate();

  if (!user || user.role !== 'student') {
    return null;
  }

  const studentClass = classes.find(c => c.id === user.classId);
  const studentQuizzes = quizzes.filter(q => q.classIds.includes(user.classId || ''));
  const studentAttempts = getAttemptsByStudent(user.id);

  const completedQuizIds = studentAttempts.map(a => a.quizId);

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
              Classe : <span className="text-foreground font-medium">{studentClass?.name || 'Non assigné'}</span>
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
                const isCompleted = completedQuizIds.includes(quiz.id);
                
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
                              Fait
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
                            {quiz.timeLimit} min
                          </div>
                        </div>
                        
                        {isCompleted ? (
                          <Button variant="outline" className="w-full" disabled>
                            Quiz terminé
                          </Button>
                        ) : (
                          <Link to={`/quiz/${quiz.id}`}>
                            <Button className="w-full gradient-primary text-primary-foreground">
                              Commencer le quiz
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
