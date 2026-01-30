import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/quiz';
import { mockStudents, mockTeachers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('quizUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check students
    const student = mockStudents.find(s => s.email === email);
    if (student && password === 'student123') {
      setUser(student);
      localStorage.setItem('quizUser', JSON.stringify(student));
      return true;
    }

    // Check teachers
    const teacher = mockTeachers.find(t => t.email === email);
    if (teacher && password === 'admin123') {
      setUser(teacher);
      localStorage.setItem('quizUser', JSON.stringify(teacher));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quizUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
