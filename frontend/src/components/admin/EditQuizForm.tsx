import { useState, useEffect } from 'react';
import { useQuiz } from '@/contexts/QuizContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Save,
  X
} from 'lucide-react';
import { Quiz, Question } from '@/types/quiz';

interface EditQuizFormProps {
  quiz: Quiz;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function EditQuizForm({ quiz, onSaved, onCancel }: EditQuizFormProps) {
  const { updateQuiz, classes } = useQuiz();

  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description);
  const [timeLimit, setTimeLimit] = useState(quiz.timeLimit);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(quiz.classIds);
  const [questions, setQuestions] = useState<Omit<Question, 'id'>[]>(
    quiz.questions.map(q => ({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer
    }))
  );
  const [errors, setErrors] = useState<string[]>([]);

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleQuestionChange = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = text;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correctAnswer = oIndex;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const addOption = (qIndex: number) => {
    if (questions[qIndex].options.length < 5) {
      const newQuestions = [...questions];
      newQuestions[qIndex].options.push('');
      setQuestions(newQuestions);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    if (questions[qIndex].options.length > 3) {
      const newQuestions = [...questions];
      newQuestions[qIndex].options.splice(oIndex, 1);
      if (newQuestions[qIndex].correctAnswer >= newQuestions[qIndex].options.length) {
        newQuestions[qIndex].correctAnswer = 0;
      }
      setQuestions(newQuestions);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!title.trim()) {
      newErrors.push('Le titre est requis');
    }
    if (selectedClasses.length === 0) {
      newErrors.push('Sélectionnez au moins une classe');
    }
    if (timeLimit < 1 || timeLimit > 180) {
      newErrors.push('Le temps limite doit être entre 1 et 180 minutes');
    }

    questions.forEach((q, i) => {
      if (!q.text.trim()) {
        newErrors.push(`Question ${i + 1}: Le texte est requis`);
      }
      const emptyOptions = q.options.filter(o => !o.trim()).length;
      if (emptyOptions > 0) {
        newErrors.push(`Question ${i + 1}: Toutes les options doivent être remplies`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const updatedQuiz: Quiz = {
      ...quiz,
      title: title.trim(),
      description: description.trim(),
      timeLimit,
      classIds: selectedClasses,
      questions: questions.map((q, i) => ({
        ...q,
        id: quiz.questions[i]?.id || `q-${Date.now()}-${i}`,
        text: q.text.trim(),
        options: q.options.map(o => o.trim()),
      })),
    };

    updateQuiz(updatedQuiz);
    onSaved?.();
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
              <Label htmlFor="edit-timeLimit" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Temps limite (minutes) *
              </Label>
              <Input
                id="edit-timeLimit"
                type="number"
                min={1}
                max={180}
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 15)}
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
          <div className="space-y-2">
            <Label>Classes assignées *</Label>
            <div className="flex flex-wrap gap-3">
              {classes.map(c => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                    selectedClasses.includes(c.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedClasses.includes(c.id)}
                    onCheckedChange={() => handleClassToggle(c.id)}
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              ))}
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
              <Label>Options (sélectionnez la bonne réponse)</Label>
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCorrectAnswerChange(qIndex, oIndex)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      question.correctAnswer === oIndex
                        ? 'bg-success text-success-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {question.correctAnswer === oIndex ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + oIndex)
                    )}
                  </button>
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    value={option}
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
      >
        <Save className="w-5 h-5 mr-2" />
        Enregistrer les modifications
      </Button>
    </form>
  );
}
