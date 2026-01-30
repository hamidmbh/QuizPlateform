export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  classId?: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit: number; // in minutes
  classIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[];
  completedAt: string;
  score?: number;
}

export interface StudentQuizStatus {
  quizId: string;
  status: 'pending' | 'completed';
  completedAt?: string;
}
