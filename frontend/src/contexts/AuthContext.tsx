import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/quiz';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Fetch current user info
        const userData = await authApi.getMe();
        
        // Backend uses TEACHER/STUDENT, frontend uses same format
        const mappedUser: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role, // Keep TEACHER/STUDENT as-is
          classId: userData.classId || userData.class_id,
        };
        
        setUser(mappedUser);
        localStorage.setItem('quizUser', JSON.stringify(mappedUser));
      } else {
        setUser(null);
        localStorage.removeItem('quizUser');
      }
    } catch (error) {
      // Token invalid or expired
      console.error('Failed to refresh user:', error);
      setUser(null);
      localStorage.removeItem('quizUser');
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(email, password);
      
      // Backend uses TEACHER/STUDENT, frontend uses same format
      const mappedUser: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role, // Keep TEACHER/STUDENT as-is
        classId: response.user.classId || response.user.class_id,
      };
      
      setUser(mappedUser);
      localStorage.setItem('quizUser', JSON.stringify(mappedUser));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quizUser');
    authApi.logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
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
