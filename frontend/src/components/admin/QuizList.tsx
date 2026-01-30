import { useState } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Trash2, 
  Edit,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditQuizForm } from './EditQuizForm';
import { Quiz } from '@/types/quiz';

interface QuizListProps {
  onEditQuiz?: (quiz: Quiz) => void;
}

export function QuizList({ onEditQuiz }: QuizListProps) {
  const { quizzes, classes, deleteQuiz, getAttemptsByQuiz } = useQuiz();
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  if (editingQuiz) {
    return (
      <EditQuizForm 
        quiz={editingQuiz} 
        onSaved={() => setEditingQuiz(null)}
        onCancel={() => setEditingQuiz(null)}
      />
    );
  }

  const getClassNames = (classIds: string[]) => {
    if (!classIds || classIds.length === 0) {
      // Legacy support: try classId
      return [];
    }
    return classIds
      .map(id => {
        // Convert both to strings for comparison to handle type mismatches
        const classIdStr = String(id);
        const foundClass = classes.find(c => String(c.id) === classIdStr);
        return foundClass?.name;
      })
      .filter(Boolean) as string[];
  };

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun quiz créé. Créez votre premier quiz !</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map((quiz, index) => {
        const attempts = getAttemptsByQuiz(quiz.id);

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
                  <div className="flex-1">
                    <CardTitle className="font-display text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{quiz.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg">
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => setEditingQuiz(quiz)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le quiz et toutes les tentatives associées seront supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={async () => {
                                try {
                                  await deleteQuiz(quiz.id);
                                } catch (error) {
                                  alert('Erreur lors de la suppression du quiz: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
                                }
                              }}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(() => {
                    const classIds = quiz.classIds || (quiz.classId ? [quiz.classId] : []);
                    const classNames = getClassNames(classIds);
                    
                    if (classNames.length > 0) {
                      return classNames.map((className, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {className}
                        </Badge>
                      ));
                    } else {
                      return (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">
                          Aucune classe assignée
                        </Badge>
                      );
                    }
                  })()}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {quiz.questions.length} questions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.durationMinutes || quiz.timeLimit || 0} min
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{attempts.length} réponses</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
