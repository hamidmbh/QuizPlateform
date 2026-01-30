import { User, Class, Quiz, QuizAttempt } from '@/types/quiz';

export const mockClasses: Class[] = [
  { id: 'class-1', name: 'Mathématiques 3ème', teacherId: 'teacher-1' },
  { id: 'class-2', name: 'Physique Terminale', teacherId: 'teacher-1' },
  { id: 'class-3', name: 'Français 2nde', teacherId: 'teacher-1' },
];

export const mockStudents: User[] = [
  { id: 'student-1', name: 'Marie Dupont', email: 'marie@school.com', role: 'student', classId: 'class-1' },
  { id: 'student-2', name: 'Pierre Martin', email: 'pierre@school.com', role: 'student', classId: 'class-1' },
  { id: 'student-3', name: 'Sophie Bernard', email: 'sophie@school.com', role: 'student', classId: 'class-2' },
  { id: 'student-4', name: 'Lucas Petit', email: 'lucas@school.com', role: 'student', classId: 'class-2' },
  { id: 'student-5', name: 'Emma Leroy', email: 'emma@school.com', role: 'student', classId: 'class-3' },
];

export const mockTeachers: User[] = [
  { id: 'teacher-1', name: 'Prof. Jean Moreau', email: 'prof@school.com', role: 'admin' },
];

export const mockQuizzes: Quiz[] = [
  {
    id: 'quiz-1',
    title: 'Équations du second degré',
    description: 'Quiz sur les équations quadratiques et leurs solutions',
    timeLimit: 15,
    classIds: ['class-1'],
    createdBy: 'teacher-1',
    createdAt: '2024-01-15',
    questions: [
      {
        id: 'q1',
        text: 'Quelle est la forme générale d\'une équation du second degré ?',
        options: ['ax + b = 0', 'ax² + bx + c = 0', 'ax³ + bx² + cx + d = 0', 'a/x + b = 0'],
        correctAnswer: 1,
      },
      {
        id: 'q2',
        text: 'Combien de solutions peut avoir une équation du second degré ?',
        options: ['Toujours 2', '0, 1 ou 2', 'Toujours 1', 'Infini'],
        correctAnswer: 1,
      },
      {
        id: 'q3',
        text: 'Que représente le discriminant Δ ?',
        options: ['La somme des racines', 'Le produit des racines', 'b² - 4ac', 'Le coefficient directeur'],
        correctAnswer: 2,
      },
    ],
  },
  {
    id: 'quiz-2',
    title: 'Les lois de Newton',
    description: 'Quiz sur les trois lois fondamentales de la mécanique',
    timeLimit: 20,
    classIds: ['class-2'],
    createdBy: 'teacher-1',
    createdAt: '2024-01-20',
    questions: [
      {
        id: 'q1',
        text: 'Que dit la première loi de Newton ?',
        options: ['F = ma', 'Action = Réaction', 'Un corps persévère dans son état', 'E = mc²'],
        correctAnswer: 2,
      },
      {
        id: 'q2',
        text: 'Quelle est l\'unité de la force ?',
        options: ['Joule', 'Watt', 'Newton', 'Pascal'],
        correctAnswer: 2,
      },
      {
        id: 'q3',
        text: 'La troisième loi de Newton est aussi appelée :',
        options: ['Loi de l\'inertie', 'Principe fondamental', 'Loi d\'action-réaction', 'Loi de la gravitation'],
        correctAnswer: 2,
      },
      {
        id: 'q4',
        text: 'F = ma est :',
        options: ['La première loi', 'La deuxième loi', 'La troisième loi', 'Aucune de ces lois'],
        correctAnswer: 1,
      },
    ],
  },
  {
    id: 'quiz-3',
    title: 'Les figures de style',
    description: 'Identifiez les différentes figures de style',
    timeLimit: 10,
    classIds: ['class-3'],
    createdBy: 'teacher-1',
    createdAt: '2024-01-25',
    questions: [
      {
        id: 'q1',
        text: '"Cette obscure clarté" est une :',
        options: ['Métaphore', 'Oxymore', 'Comparaison', 'Hyperbole'],
        correctAnswer: 1,
      },
      {
        id: 'q2',
        text: '"Il est fort comme un lion" est une :',
        options: ['Métaphore', 'Personnification', 'Comparaison', 'Antithèse'],
        correctAnswer: 2,
      },
      {
        id: 'q3',
        text: '"J\'ai mille choses à faire" est une :',
        options: ['Litote', 'Euphémisme', 'Hyperbole', 'Métonymie'],
        correctAnswer: 2,
      },
    ],
  },
];

export const mockAttempts: QuizAttempt[] = [
  {
    id: 'attempt-1',
    quizId: 'quiz-1',
    studentId: 'student-1',
    answers: [1, 1, 2],
    completedAt: '2024-01-16',
    score: 100,
  },
  {
    id: 'attempt-2',
    quizId: 'quiz-1',
    studentId: 'student-2',
    answers: [1, 0, 2],
    completedAt: '2024-01-17',
    score: 66,
  },
];

// Demo credentials
export const demoCredentials = {
  student: { email: 'marie@school.com', password: 'student123' },
  admin: { email: 'prof@school.com', password: 'admin123' },
};
