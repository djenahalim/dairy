import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  theme?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Helper function to get API URL - use relative URLs for Next.js
const getApiUrl = (path: string) => {
  // Convert /pages/api/... to /api/... for proper routing
  const apiPath = path.replace('/pages/api/', '/api/');
  return apiPath;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('dairy-token');
    const userData = localStorage.getItem('dairy-user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (error) {
        localStorage.removeItem('dairy-token');
        localStorage.removeItem('dairy-user');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid username or password');
      }

      // Store token and user data
      localStorage.setItem('dairy-token', data.token);
      localStorage.setItem('dairy-user', JSON.stringify(data.user));

      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token and user data
      localStorage.setItem('dairy-token', data.token);
      localStorage.setItem('dairy-user', JSON.stringify(data.user));

      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('dairy-token');
    localStorage.removeItem('dairy-user');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    if (router) {
      router.push('/auth');
    }
  };

  const getToken = () => {
    return localStorage.getItem('dairy-token');
  };

  return {
    ...state,
    login,
    register,
    logout,
    getToken
  };
}