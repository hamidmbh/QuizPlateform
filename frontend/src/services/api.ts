/**
 * Centralized API client for backend integration
 * Handles JWT authentication and all API endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const setToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

const removeToken = (): void => {
  localStorage.removeItem('authToken');
};

// API client with automatic JWT attachment
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  // Ensure endpoint starts with / if it doesn't already
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Log the URL for debugging
  console.log('🌐 API Request:', { 
    method: options.method || 'GET', 
    endpoint: normalizedEndpoint,
    API_BASE_URL,
    fullUrl: url
  });
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    removeToken();
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized - Please login again');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {} as T;
};

// Auth API
export const authApi = {
  /**
   * Login and get JWT token
   * POST /auth/login
   */
  login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
    const response = await apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  /**
   * Get current user info
   * GET /me
   */
  getMe: async (): Promise<any> => {
    return apiRequest<any>('/me');
  },

  /**
   * Logout (clear token)
   */
  logout: (): void => {
    removeToken();
  },
};

// Teacher API
export const teacherApi = {
  /**
   * Get all classes
   * GET /classes
   */
  getClasses: async (): Promise<any[]> => {
    return apiRequest<any[]>('/classes');
  },

  /**
   * Create a new class
   * POST /classes
   */
  createClass: async (data: { name: string }): Promise<any> => {
    return apiRequest<any>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get students in a class
   * GET /classes/:id/students
   */
  getClassStudents: async (classId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/classes/${classId}/students`);
  },

  /**
   * Create a quiz for a class
   * POST /classes/:id/quizzes
   */
  createQuiz: async (classId: string, quizData: {
    title: string;
    description: string;
    durationMinutes: number;
    openAt: string;
    closeAt: string;
    questions: Array<{
      text: string;
      options: Array<{ text: string; isCorrect: boolean }>;
    }>;
  }): Promise<any> => {
    return apiRequest<any>(`/classes/${classId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  /**
   * Get all quizzes (for teachers)
   * GET /quizzes
   */
  getQuizzes: async (): Promise<any[]> => {
    return apiRequest<any[]>('/quizzes');
  },

  /**
   * Delete a quiz
   * DELETE /quizzes/:id
   */
  deleteQuiz: async (quizId: string): Promise<void> => {
    return apiRequest<void>(`/quizzes/${quizId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get submissions for a quiz
   * GET /quizzes/:id/submissions
   */
  getQuizSubmissions: async (quizId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/quizzes/${quizId}/submissions`);
  },

  /**
   * Get a specific submission
   * GET /submissions/:id
   */
  getSubmission: async (submissionId: string): Promise<any> => {
    return apiRequest<any>(`/submissions/${submissionId}`);
  },

  /**
   * Create a student
   * POST /students
   */
  createStudent: async (data: {
    name: string;
    email: string;
    password: string;
    classId: string;
  }): Promise<any> => {
    return apiRequest<any>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a student
   * PUT /students/:id
   */
  updateStudent: async (studentId: string, data: {
    name?: string;
    email?: string;
    password?: string;
    classId?: string;
  }): Promise<any> => {
    return apiRequest<any>(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a student
   * DELETE /students/:id
   */
  deleteStudent: async (studentId: string): Promise<void> => {
    return apiRequest<void>(`/students/${studentId}`, {
      method: 'DELETE',
    });
  },
};

// Student API
export const studentApi = {
  /**
   * Get available quizzes for student
   * GET /student/quizzes
   */
  getQuizzes: async (): Promise<any[]> => {
    return apiRequest<any[]>('/student/quizzes');
  },

  /**
   * Start a quiz (creates submission)
   * POST /quizzes/:id/start
   * Returns: { submission: { id, startedAt, expiresAt, ... } }
   */
  startQuiz: async (quizId: string): Promise<{ submission: any }> => {
    return apiRequest<{ submission: any }>(`/quizzes/${quizId}/start`, {
      method: 'POST',
    });
  },

  /**
   * Submit quiz answers
   * POST /quizzes/:id/submit
   * Body: { answers: [{ questionId, optionId }] }
   */
  submitQuiz: async (
    quizId: string,
    answers: Array<{ questionId: string; optionId: string }>
  ): Promise<any> => {
    return apiRequest<any>(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },
};

export default {
  auth: authApi,
  teacher: teacherApi,
  student: studentApi,
  getToken,
  removeToken,
};