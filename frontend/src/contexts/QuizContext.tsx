import React, { createContext, useContext, useState, useEffect } from 'react';
import { Quiz, QuizAttempt, User, Class } from '@/types/quiz';
import { mockQuizzes, mockAttempts, mockStudents, mockClasses } from '@/data/mockData';

interface QuizContextType {
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  students: User[];
  classes: Class[];
  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (quiz: Quiz) => void;
  deleteQuiz: (quizId: string) => void;
  addAttempt: (attempt: QuizAttempt) => void;
  addStudent: (student: User) => void;
  deleteStudent: (studentId: string) => void;
  getQuizzesForStudent: (studentId: string, classId: string) => Quiz[];
  getAttemptsByStudent: (studentId: string) => QuizAttempt[];
  getAttemptsByQuiz: (quizId: string) => QuizAttempt[];
  resetQuizForStudent: (quizId: string, studentId: string) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes] = useState<Class[]>(mockClasses);

  useEffect(() => {
    // Load from localStorage or use mock data
    const savedQuizzes = localStorage.getItem('quizzes');
    const savedAttempts = localStorage.getItem('attempts');
    const savedStudents = localStorage.getItem('students');

    setQuizzes(savedQuizzes ? JSON.parse(savedQuizzes) : mockQuizzes);
    setAttempts(savedAttempts ? JSON.parse(savedAttempts) : mockAttempts);
    setStudents(savedStudents ? JSON.parse(savedStudents) : mockStudents);
  }, []);

  useEffect(() => {
    if (quizzes.length > 0) {
      localStorage.setItem('quizzes', JSON.stringify(quizzes));
    }
  }, [quizzes]);

  useEffect(() => {
    localStorage.setItem('attempts', JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem('students', JSON.stringify(students));
    }
  }, [students]);

  const addQuiz = (quiz: Quiz) => {
    setQuizzes(prev => [...prev, quiz]);
  };

  const updateQuiz = (quiz: Quiz) => {
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? quiz : q));
  };

  const deleteQuiz = (quizId: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  const addAttempt = (attempt: QuizAttempt) => {
    setAttempts(prev => [...prev, attempt]);
  };

  const addStudent = (student: User) => {
    setStudents(prev => [...prev, student]);
  };

  const deleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const getQuizzesForStudent = (studentId: string, classId: string) => {
    return quizzes.filter(q => q.classIds.includes(classId));
  };

  const getAttemptsByStudent = (studentId: string) => {
    return attempts.filter(a => a.studentId === studentId);
  };

  const getAttemptsByQuiz = (quizId: string) => {
    return attempts.filter(a => a.quizId === quizId);
  };

  const resetQuizForStudent = (quizId: string, studentId: string) => {
    setAttempts(prev => prev.filter(a => !(a.quizId === quizId && a.studentId === studentId)));
  };

  return (
    <QuizContext.Provider value={{
      quizzes,
      attempts,
      students,
      classes,
      addQuiz,
      updateQuiz,
      deleteQuiz,
      addAttempt,
      addStudent,
      deleteStudent,
      getQuizzesForStudent,
      getAttemptsByStudent,
      getAttemptsByQuiz,
      resetQuizForStudent,
    }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
