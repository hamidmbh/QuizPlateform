import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQuiz } from '@/contexts/QuizContext';
import { teacherApi } from '@/services/api';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FileDown,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { exportResultsToPDF, exportDetailedResultsToPDF } from '@/utils/pdfExport';

export function QuizResults() {
  const { quizzes, students, classes, resetQuizForStudent } = useQuiz();
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Fetch submissions for selected quiz (or all quizzes)
  const { data: submissionsData = [], isLoading: isLoadingSubmissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', selectedQuiz],
    queryFn: async () => {
      if (selectedQuiz === 'all') {
        // Fetch submissions for all quizzes
        const allSubmissions: any[] = [];
        for (const quiz of quizzes) {
          try {
            const quizSubmissions = await teacherApi.getQuizSubmissions(quiz.id);
            allSubmissions.push(...quizSubmissions);
          } catch (error) {
            console.error(`Failed to fetch submissions for quiz ${quiz.id}:`, error);
          }
        }
        return allSubmissions;
      } else {
        // Fetch submissions for selected quiz
        return await teacherApi.getQuizSubmissions(selectedQuiz);
      }
    },
    enabled: quizzes.length > 0,
    refetchOnWindowFocus: true, // Auto-refresh when window regains focus
  });

  const handleExportPDF = () => {
    // Convert submissions to attempts format for PDF export
    const attempts = submissionsData.map((sub: any) => ({
      id: sub.id,
      quizId: sub.quizId,
      studentId: sub.studentId,
      answers: sub.answers || [],
      completedAt: sub.submittedAt || sub.startedAt,
      score: sub.score,
    }));
    
    exportResultsToPDF({
      quizzes,
      attempts,
      students,
      classes,
      selectedQuiz,
      selectedClass
    });
  };

  const handleExportQuizPDF = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      const quizSubmissions = submissionsData.filter((sub: any) => sub.quizId === quizId);
      const attempts = quizSubmissions.map((sub: any) => ({
        id: sub.id,
        quizId: sub.quizId,
        studentId: sub.studentId,
        answers: sub.answers || [],
        completedAt: sub.submittedAt || sub.startedAt,
        score: sub.score,
      }));
      
      exportDetailedResultsToPDF({
        quiz,
        attempts,
        students,
        classes
      });
    }
  };

  // Filter students based on selected class
  const filteredStudents = students.filter(s => 
    selectedClass === 'all' || s.classId === selectedClass
  );

  // Get submissions for a student (convert backend submissions to attempt format)
  const getStudentAttempts = (studentId: string) => {
    return submissionsData
      .filter((sub: any) => {
        const matchesStudent = sub.studentId === studentId;
        const matchesQuiz = selectedQuiz === 'all' || sub.quizId === selectedQuiz;
        return matchesStudent && matchesQuiz;
      })
      .map((sub: any) => ({
        id: sub.id,
        quizId: sub.quizId,
        studentId: sub.studentId,
        answers: sub.answers || [], // Backend format: [{ questionId, optionId }]
        completedAt: sub.submittedAt || sub.startedAt,
        score: sub.score,
      }));
  };

  const getQuizById = (quizId: string) => quizzes.find(q => q.id === quizId);

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <BarChart3 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par quiz" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg">
              <SelectItem value="all">Tous les quiz</SelectItem>
              {quizzes.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par classe" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg">
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleExportPDF}
          className="gradient-primary text-primary-foreground"
        >
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      {/* Loading state */}
      {isLoadingSubmissions && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des résultats...</p>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {!isLoadingSubmissions && filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun étudiant trouvé.</p>
          </CardContent>
        </Card>
      ) : !isLoadingSubmissions && (
        <div className="space-y-4">
          {filteredStudents.map((student, index) => {
            const studentAttempts = getStudentAttempts(student.id);
            const studentClass = classes.find(c => c.id === student.classId);
            const isExpanded = expandedStudent === student.id;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card>
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => setExpandedStudent(isExpanded ? null : student.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-base">{student.name}</CardTitle>
                              <CardDescription>{studentClass?.name}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              {studentAttempts.filter((a: any) => a.score !== null && a.score !== undefined).length} quiz complété(s)
                            </Badge>
                            {studentAttempts.length > 0 && (
                              <Badge variant="outline">
                                {studentAttempts.length} tentative(s) totale(s)
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {studentAttempts.length === 0 ? (
                          <p className="text-muted-foreground text-sm py-4">
                            Aucun quiz passé pour le moment.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {studentAttempts.map(attempt => {
                              const quiz = getQuizById(attempt.quizId);
                              if (!quiz) return null;

                              return (
                                <div 
                                  key={attempt.id}
                                  className="border border-border rounded-lg p-4"
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h4 className="font-semibold">{quiz.title}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Passé le {new Date(attempt.completedAt).toLocaleDateString('fr-FR')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        className={
                                          (attempt.score || 0) >= 50 
                                            ? 'bg-success/20 text-success hover:bg-success/30 border-0' 
                                            : 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-0'
                                        }
                                      >
                                        {attempt.score}%
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleExportQuizPDF(quiz.id)}
                                      >
                                        <FileDown className="w-4 h-4 mr-1" />
                                        PDF
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <RotateCcw className="w-4 h-4 mr-1" />
                                            Réinitialiser
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Réinitialiser ce quiz ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              L'étudiant pourra repasser ce quiz. Sa tentative actuelle sera supprimée.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => resetQuizForStudent(quiz.id, student.id)}
                                            >
                                              Réinitialiser
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>

                                  {/* Questions & Answers */}
                                  <div className="space-y-3">
                                    {quiz.questions.map((question, qIndex) => {
                                      // Find the answer for this question
                                      const answer = Array.isArray(attempt.answers) 
                                        ? attempt.answers.find((a: any) => 
                                            a.questionId === question.id || 
                                            (typeof a === 'object' && a.questionId === question.id)
                                          )
                                        : null;
                                      
                                      // Handle both formats: { questionId, optionId } or index
                                      let selectedOptionId: string | null = null;
                                      let selectedOptionIndex: number = -1;
                                      
                                      if (answer) {
                                        if (typeof answer === 'object' && answer.optionId) {
                                          selectedOptionId = answer.optionId;
                                          selectedOptionIndex = question.options.findIndex(opt => opt.id === answer.optionId);
                                        } else if (typeof answer === 'number') {
                                          selectedOptionIndex = answer;
                                          selectedOptionId = question.options[answer]?.id || null;
                                        }
                                      }
                                      
                                      // Check if correct (find correct option)
                                      const correctOption = question.options.find(opt => opt.isCorrect);
                                      const isCorrect = selectedOptionId === correctOption?.id;

                                      return (
                                        <div 
                                          key={question.id}
                                          className={`p-3 rounded-lg border ${
                                            isCorrect 
                                              ? 'border-success/30 bg-success/5' 
                                              : 'border-destructive/30 bg-destructive/5'
                                          }`}
                                        >
                                          <div className="flex items-start gap-2">
                                            {isCorrect ? (
                                              <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                                            ) : (
                                              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                              <p className="font-medium text-sm mb-2">
                                                {qIndex + 1}. {question.text}
                                              </p>
                                              <div className="text-sm">
                                                <p className="text-muted-foreground">
                                                  Réponse de l'étudiant :{' '}
                                                  <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                                                    {selectedOptionIndex >= 0 && selectedOptionIndex < question.options.length
                                                      ? question.options[selectedOptionIndex].text
                                                      : 'Non répondu'}
                                                  </span>
                                                </p>
                                                {!isCorrect && correctOption && (
                                                  <p className="text-success">
                                                    Bonne réponse : {correctOption.text}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
