import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Quiz, QuizAttempt, User, Class, Submission } from '@/types/quiz';
import { teacherApi, studentApi } from '@/services/api';
import { useAuth } from './AuthContext';

interface QuizContextType {
  // Data
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  students: User[];
  classes: Class[];
  
  // Loading states
  isLoadingQuizzes: boolean;
  isLoadingClasses: boolean;
  isLoadingStudents: boolean;
  
  // Mutations
  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (quiz: Quiz) => void;
  deleteQuiz: (quizId: string) => Promise<void>;
  addAttempt: (attempt: QuizAttempt) => void;
  addStudent: (student: User) => void;
  deleteStudent: (studentId: string) => void;
  
  // Getters
  getQuizzesForStudent: (studentId: string, classId: string) => Quiz[];
  getAttemptsByStudent: (studentId: string) => QuizAttempt[];
  getAttemptsByQuiz: (quizId: string) => QuizAttempt[];
  resetQuizForStudent: (quizId: string, studentId: string) => void;
  
  // Refetch functions
  refetchQuizzes: () => void;
  refetchClasses: () => void;
  refetchStudents: () => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

// Helper to map backend quiz to frontend format
const mapQuizFromBackend = (backendQuiz: any): Quiz => {
  // Extract class IDs from the classes relationship
  let classIds: string[] = [];
  
  // Priority 1: Use classIds array if provided directly by backend (preferred)
  if (backendQuiz.classIds && Array.isArray(backendQuiz.classIds) && backendQuiz.classIds.length > 0) {
    classIds = backendQuiz.classIds.map((id: any) => String(id));
  }
  // Priority 2: Extract from classes relationship array
  else if (backendQuiz.classes && Array.isArray(backendQuiz.classes) && backendQuiz.classes.length > 0) {
    classIds = backendQuiz.classes
      .map((c: any) => {
        // Handle both direct ID and pivot table ID
        const id = c.id || c.pivot?.class_id || c.pivot?.classId;
        return id ? String(id) : null;
      })
      .filter((id: string | null): id is string => id !== null);
  }
  // Priority 3: Legacy support: single classId (for old quizzes)
  else if (backendQuiz.classId || backendQuiz.class_id) {
    classIds = [String(backendQuiz.classId || backendQuiz.class_id)];
  }
  
  // If still no classIds found, log a warning (but don't break)
  if (classIds.length === 0) {
    console.warn('Quiz has no classes assigned:', {
      quizId: backendQuiz.id,
      quizTitle: backendQuiz.title,
      classes: backendQuiz.classes,
      classIds: backendQuiz.classIds,
    });
  }

  return {
    id: String(backendQuiz.id),
    title: backendQuiz.title,
    description: backendQuiz.description || '',
    questions: (backendQuiz.questions || []).map((q: any) => ({
      id: String(q.id),
      text: q.text,
      options: (q.options || []).map((o: any) => ({
        id: String(o.id),
        text: o.text,
        isCorrect: o.is_correct || o.isCorrect || false,
      })),
    })),
    durationMinutes: backendQuiz.duration_minutes || backendQuiz.durationMinutes,
    classIds: classIds,
    openAt: backendQuiz.open_at || backendQuiz.openAt,
    closeAt: backendQuiz.close_at || backendQuiz.closeAt,
    createdBy: String(backendQuiz.created_by || backendQuiz.createdBy),
    createdAt: backendQuiz.created_at || backendQuiz.createdAt,
    // Legacy support
    classId: classIds.length > 0 ? classIds[0] : undefined,
  };
};

// Helper to map backend class to frontend format
const mapClassFromBackend = (backendClass: any): Class => {
  return {
    id: String(backendClass.id), // Ensure ID is always a string for consistent comparison
    name: backendClass.name,
    teacherId: String(backendClass.teacherId || backendClass.teacher_id),
    students: backendClass.students?.map(mapUserFromBackend) || [],
    students_count: backendClass.students_count || (Array.isArray(backendClass.students) ? backendClass.students.length : 0),
  };
};

// Helper to map backend user to frontend format
const mapUserFromBackend = (backendUser: any): User => {
  const classId = backendUser.classId ?? backendUser.class_id;
  return {
    id: String(backendUser.id),
    name: backendUser.name,
    email: backendUser.email,
    role: backendUser.role,
    classId: classId != null ? String(classId) : undefined,
  };
};

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch classes (for teachers)
  const { 
    data: classesData = [], 
    isLoading: isLoadingClasses,
    refetch: refetchClasses 
  } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      if (user?.role === 'TEACHER') {
        const classes = await teacherApi.getClasses();
        return classes.map(mapClassFromBackend);
      }
      return [];
    },
    enabled: !!user && user.role === 'TEACHER',
  });

  // Fetch quizzes (for teachers - all quizzes they created)
  const { 
    data: quizzesData = [], 
    isLoading: isLoadingQuizzes,
    refetch: refetchQuizzes 
  } = useQuery({
    queryKey: ['quizzes', 'teacher'],
    queryFn: async () => {
      if (user?.role === 'TEACHER') {
        try {
          const quizzes = await teacherApi.getQuizzes();
          console.log('📥 Raw quizzes from API:', quizzes);
          const mappedQuizzes = quizzes.map(mapQuizFromBackend);
          console.log('📤 Mapped quizzes:', mappedQuizzes);
          return mappedQuizzes;
        } catch (error) {
          console.error('Failed to fetch quizzes:', error);
          return [];
        }
      }
      return [];
    },
    enabled: !!user && user.role === 'TEACHER',
  });

  // Fetch students (for teachers - from all classes)
  const { 
    data: studentsData = [], 
    isLoading: isLoadingStudents,
    refetch: refetchStudents 
  } = useQuery({
    queryKey: ['students', 'teacher'],
    queryFn: async () => {
      if (user?.role === 'TEACHER' && classesData.length > 0) {
        const allStudents: User[] = [];
        for (const classItem of classesData) {
          try {
            const classStudents = await teacherApi.getClassStudents(classItem.id);
            allStudents.push(...classStudents.map(mapUserFromBackend));
          } catch (error) {
            console.error(`Failed to fetch students for class ${classItem.id}:`, error);
          }
        }
        return allStudents;
      }
      return [];
    },
    enabled: !!user && user.role === 'TEACHER' && classesData.length > 0,
  });

  // Attempts are stored locally or fetched per quiz
  // We'll use a simple in-memory store for now
  const [attempts, setAttempts] = React.useState<QuizAttempt[]>([]);

  // Load attempts from localStorage on mount
  React.useEffect(() => {
    const savedAttempts = localStorage.getItem('attempts');
    if (savedAttempts) {
      try {
        setAttempts(JSON.parse(savedAttempts));
      } catch (error) {
        console.error('Failed to load attempts from localStorage:', error);
      }
    }
  }, []);

  // Save attempts to localStorage
  React.useEffect(() => {
    localStorage.setItem('attempts', JSON.stringify(attempts));
  }, [attempts]);

  const addQuiz = (quiz: Quiz) => {
    // This will be handled by the mutation in CreateQuizForm
    // Just invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  };

  const updateQuiz = (quiz: Quiz) => {
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      await teacherApi.deleteQuiz(quizId);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] }); // Also refresh submissions
      queryClient.invalidateQueries({ queryKey: ['studentQuizzes'] }); // Refresh student view
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      throw error; // Re-throw so UI can handle it
    }
  };

  const addAttempt = (attempt: QuizAttempt) => {
    setAttempts(prev => [...prev, attempt]);
  };

  const addStudent = (student: User) => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const deleteStudent = (studentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const getQuizzesForStudent = (studentId: string, classId: string) => {
    return quizzesData.filter(q => 
      (q.classIds && q.classIds.includes(classId)) || 
      (q.classId === classId) // Legacy support
    );
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
      quizzes: quizzesData,
      attempts,
      students: studentsData,
      classes: classesData,
      isLoadingQuizzes,
      isLoadingClasses,
      isLoadingStudents,
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
      refetchQuizzes,
      refetchClasses,
      refetchStudents,
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
