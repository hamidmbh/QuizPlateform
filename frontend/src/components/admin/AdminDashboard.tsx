import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuiz } from '@/contexts/QuizContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  BookOpen, 
  Users, 
  PlusCircle,
  BarChart3,
  School,
  User
} from 'lucide-react';
import { QuizList } from './QuizList';
import { StudentList } from './StudentList';
import { CreateQuizForm } from './CreateQuizForm';
import { QuizResults } from './QuizResults';
import { ClassManagement } from './ClassManagement';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { quizzes, students, classes } = useQuiz();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quizzes');

  if (!user || user.role !== 'TEACHER') {
    return null;
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
            <span className="text-muted-foreground text-sm font-normal ml-2">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/profile"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">{user.name}</span>
            </Link>
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
            <h1 className="font-display text-3xl font-bold mb-2">Tableau de bord Professeur</h1>
            <p className="text-muted-foreground">Gérez vos quiz et suivez vos étudiants</p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{quizzes.length}</p>
                    <p className="text-muted-foreground text-sm">Quiz créés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-muted-foreground text-sm">Étudiants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{classes.length}</p>
                    <p className="text-muted-foreground text-sm">Classes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{quizzes.reduce((acc, q) => acc + q.questions.length, 0)}</p>
                    <p className="text-muted-foreground text-sm">Questions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="classes" className="flex items-center gap-2">
                <School className="w-4 h-4" />
                <span className="hidden sm:inline">Classes</span>
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Quiz</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Créer</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Étudiants</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Résultats</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classes">
              <ClassManagement />
            </TabsContent>

            <TabsContent value="quizzes">
              <QuizList />
            </TabsContent>

            <TabsContent value="create">
              <CreateQuizForm onCreated={() => setActiveTab('quizzes')} />
            </TabsContent>

            <TabsContent value="students">
              <StudentList />
            </TabsContent>

            <TabsContent value="results">
              <QuizResults />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
