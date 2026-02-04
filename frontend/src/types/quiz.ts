export interface User {
  id: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'STUDENT'; // Backend uses TEACHER/STUDENT
  classId?: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  students?: User[];
  students_count?: number;
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  durationMinutes: number; // Backend uses durationMinutes
  classIds: string[]; // Array of class IDs (quiz can be assigned to multiple classes)
  openAt: string; // ISO date string
  closeAt: string; // ISO date string
  createdBy: string;
  createdAt: string;
  // Legacy support - will be removed
  classId?: string;
  timeLimit?: number;
}

// Submission from backend
export interface Submission {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: string; // ISO date string
  expiresAt: string; // ISO date string
  submittedAt?: string; // ISO date string
  score?: number;
  answers: Answer[];
}

export interface Answer {
  id: string;
  questionId: string;
  optionId: string; // Selected option ID
}

// For compatibility with existing code
export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[]; // Legacy format - option indices
  completedAt: string;
  score?: number;
}

export interface StudentQuizStatus {
  quizId: string;
  status: 'pending' | 'completed';
  completedAt?: string;
}

// API Response types
export interface StartQuizResponse {
  submission: Submission;
}

export interface SubmitQuizRequest {
  answers: { questionId: string; optionId: string }[];
}
