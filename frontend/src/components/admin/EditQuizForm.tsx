import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuiz } from '@/contexts/QuizContext';
import { teacherApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  PlusCircle, 
  Trash2,
  Clock,
  BookOpen,
  CheckCircle,
  Save,
  X,
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
import { Quiz, Question, Option } from '@/types/quiz';

interface EditQuizFormProps {
  quiz: Quiz;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface QuestionForm {
  id?: string;
  text: string;
  options: Array<{ id?: string; text: string; isCorrect: boolean }>;
}

export function EditQuizForm({ quiz, onSaved, onCancel }: EditQuizFormProps) {
  const { classes, isLoadingClasses } = useQuiz();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map quiz data to form format
  const [title, setTitle] = useState(quiz.title || '');
  const [description, setDescription] = useState(quiz.description || '');
  const [durationMinutes, setDurationMinutes] = useState(quiz.durationMinutes || quiz.timeLimit || 15);
  const [selectedClassId, setSelectedClassId] = useState(quiz.classId || '');
  const [openAt, setOpenAt] = useState(
    quiz.openAt ? new Date(quiz.openAt).toISOString().slice(0, 16) : ''
  );
  const [closeAt, setCloseAt] = useState(
    quiz.closeAt ? new Date(quiz.closeAt).toISOString().slice(0, 16) : ''
  );
  const [questions, setQuestions] = useState<QuestionForm[]>(() => {
    if (quiz.questions && quiz.questions.length > 0) {
      return quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options.map((opt: Option | string, index: number) => {
          if (typeof opt === 'string') {
            // Legacy format
            return { text: opt, isCorrect: false };
          }
          return {
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          };
        }),
      }));
    }
    return [{ text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }];
  });
  const [errors, setErrors] = useState<string[]>([]);

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
    // Set all options to false first
    newQuestions[qIndex].options.forEach(opt => opt.isCorrect = false);
    // Set selected option to true
    newQuestions[qIndex].options[oIndex].isCorrect = true;
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
      // Reset correct answer if needed
      if (!newQuestions[qIndex].options.some(opt => opt.isCorrect)) {
        newQuestions[qIndex].options[0].isCorrect = true;
      }
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
        newErrors.push(`Question ${i + 1}: Une option correcte doit être sélectionnée`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Note: Backend doesn't have an update quiz endpoint yet
  // For now, we'll just show a message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors(['La modification des quiz n\'est pas encore implémentée côté backend. Veuillez supprimer et recréer le quiz.']);
    setIsSubmitting(false);
    
    // TODO: Implement when backend supports quiz updates
    // const quizData = {
    //   title: title.trim(),
    //   description: description.trim(),
    //   durationMinutes,
    //   openAt: new Date(openAt).toISOString(),
    //   closeAt: new Date(closeAt).toISOString(),
    //   questions: questions.map(q => ({
    //     text: q.text.trim(),
    //     options: q.options
    //       .filter(o => o.text.trim())
    //       .map(opt => ({
    //         text: opt.text.trim(),
    //         isCorrect: opt.isCorrect,
    //       })),
    //   })),
    // };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with Cancel button */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Modifier le quiz</h2>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
      </div>

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
              <Label htmlFor="edit-title">Titre du quiz *</Label>
              <Input
                id="edit-title"
                placeholder="Ex: Équations du second degré"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-durationMinutes" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Durée (minutes) *
              </Label>
              <Input
                id="edit-durationMinutes"
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Décrivez brièvement le contenu du quiz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-classId">Classe assignée *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="edit-classId">
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
              <Label htmlFor="edit-openAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date d'ouverture *
              </Label>
              <Input
                id="edit-openAt"
                type="datetime-local"
                value={openAt}
                onChange={(e) => setOpenAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-closeAt" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de fermeture *
              </Label>
              <Input
                id="edit-closeAt"
                type="datetime-local"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.map((question, qIndex) => {
        const correctIndex = question.options.findIndex(opt => opt.isCorrect);
        return (
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
                <Label>Options (sélectionnez la bonne réponse) *</Label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCorrectAnswerChange(qIndex, oIndex)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        option.isCorrect
                          ? 'bg-success text-success-foreground'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {option.isCorrect ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        String.fromCharCode(65 + oIndex)
                      )}
                    </button>
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
        );
      })}

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
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            Enregistrer les modifications
          </>
        )}
      </Button>
    </form>
  );
}
