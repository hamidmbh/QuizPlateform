import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuiz } from '@/contexts/QuizContext';
import { useAuth } from '@/contexts/AuthContext';
import { teacherApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  PlusCircle, 
  Trash2,
  Clock,
  BookOpen,
  CheckCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateQuizFormProps {
  onCreated?: () => void;
}

interface QuestionForm {
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

export function CreateQuizForm({ onCreated }: CreateQuizFormProps) {
  const { classes, isLoadingClasses } = useQuiz();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { 
      text: '', 
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    }
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (quizData: any) => {
      if (!selectedClassId) throw new Error('Classe requise');
      return await teacherApi.createQuiz(selectedClassId, quizData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      // Reset form
      setTitle('');
      setDescription('');
      setDurationMinutes(15);
      setSelectedClassId('');
      setOpenAt('');
      setCloseAt('');
      setQuestions([{ 
        text: '', 
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]
      }]);
      setErrors([]);
      onCreated?.();
    },
    onError: (error: any) => {
      setErrors([error.message || 'Erreur lors de la création du quiz']);
      setIsSubmitting(false);
    },
  });

  const handleQuestionChange = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = text;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    // Toggle correct status (support multiple correct answers)
    newQuestions[qIndex].options[oIndex].isCorrect = !newQuestions[qIndex].options[oIndex].isCorrect;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      text: '', 
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const addOption = (qIndex: number) => {
    if (questions[qIndex].options.length < 5) {
      const newQuestions = [...questions];
      newQuestions[qIndex].options.push({ text: '', isCorrect: false });
      setQuestions(newQuestions);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    if (questions[qIndex].options.length > 3) {
      const newQuestions = [...questions];
      newQuestions[qIndex].options.splice(oIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!title.trim()) {
      newErrors.push('Le titre est requis');
    }
    if (!selectedClassId) {
      newErrors.push('Sélectionnez une classe');
    }
    if (durationMinutes < 1 || durationMinutes > 180) {
      newErrors.push('Le temps limite doit être entre 1 et 180 minutes');
    }
    if (!openAt) {
      newErrors.push('La date d\'ouverture est requise');
    }
    if (!closeAt) {
      newErrors.push('La date de fermeture est requise');
    }
    if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) {
      newErrors.push('La date de fermeture doit être après la date d\'ouverture');
    }

    questions.forEach((q, i) => {
      if (!q.text.trim()) {
        newErrors.push(`Question ${i + 1}: Le texte est requis`);
      }
      const validOptions = q.options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        newErrors.push(`Question ${i + 1}: Au moins 2 options sont requises`);
      }
      const hasCorrect = q.options.some(opt => opt.isCorrect && opt.text.trim());
      if (!hasCorrect) {
        newErrors.push(`Question ${i + 1}: Au moins une option correcte doit être sélectionnée`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    setIsSubmitting(true);

    // Convert questions to backend format
    const questionsData = questions.map((q) => ({
      text: q.text.trim(),
      options: q.options
        .filter(o => o.text.trim()) // Remove empty options
        .map((opt) => ({
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
        })),
    }));

    const quizData = {
      title: title.trim(),
      description: description.trim(),
      durationMinutes,
      openAt: new Date(openAt).toISOString(),
      closeAt: new Date(closeAt).toISOString(),
      questions: questionsData,
    };

    createQuizMutation.mutate(quizData);
  };

  // Set default dates (open now, close in 7 days) on mount
  useEffect(() => {
    if (!openAt) {
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      setOpenAt(now.toISOString().slice(0, 16));
    }
    if (!closeAt) {
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      in7Days.setHours(23);
      in7Days.setMinutes(59);
      setCloseAt(in7Days.toISOString().slice(0, 16));
    }
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quiz Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Informations du quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du quiz *</Label>
              <Input
                id="title"
                placeholder="Ex: Équations du second degré"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Durée (minutes) *
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez brièvement le contenu du quiz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classId">Classe assignée *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="classId">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClasses ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : classes.length === 0 ? (
                    <SelectItem value="none" disabled>Aucune classe disponible</SelectItem>
                  ) : (
                    classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date d'ouverture *
              </Label>
              <Input
                id="openAt"
                type="datetime-local"
                value={openAt}
                onChange={(e) => setOpenAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de fermeture *
              </Label>
              <Input
                id="closeAt"
                type="datetime-local"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.map((question, qIndex) => (
        <Card key={qIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">
                Question {qIndex + 1}
              </CardTitle>
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Texte de la question *</Label>
              <Textarea
                placeholder="Posez votre question..."
                value={question.text}
                onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <Label>Options (cochez une ou plusieurs bonnes réponses) *</Label>
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3">
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                    className="shrink-0"
                  />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    option.isCorrect
                      ? 'bg-success text-success-foreground'
                      : 'bg-secondary text-foreground'
                  }`}>
                    {String.fromCharCode(65 + oIndex)}
                  </div>
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                    className="flex-1"
                  />
                  {question.options.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(qIndex, oIndex)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {question.options.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(qIndex)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Ajouter une option
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Question Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addQuestion}
        className="w-full"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Ajouter une question
      </Button>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <ul className="list-disc list-inside text-sm text-destructive space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Button 
        type="submit" 
        className="w-full gradient-primary text-primary-foreground shadow-primary"
        size="lg"
        disabled={isSubmitting || createQuizMutation.isPending}
      >
        {isSubmitting || createQuizMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Création en cours...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Créer le quiz
          </>
        )}
      </Button>
    </form>
  );
}
