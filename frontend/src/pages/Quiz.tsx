import { useAuth } from '@/contexts/AuthContext';
import { QuizTaking } from '@/components/student/QuizTaking';
import { Navigate } from 'react-router-dom';

export default function QuizPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  return <QuizTaking />;
}
