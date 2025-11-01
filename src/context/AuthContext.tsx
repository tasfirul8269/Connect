import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, SignupData } from '../types';
import { authService } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      authService.verifyToken()
        .then((response) => {
          setUser(response.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      setIsGuest(false);
      localStorage.setItem('token', response.token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      const response = await authService.signup(userData);
      setUser(response.user);
      setIsGuest(false);
      localStorage.setItem('token', response.token);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state and storage regardless of API call result
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem('token');
      
      // Clear any other stored data if needed
      // localStorage.removeItem('otherData');
      
      // Force a full page reload to ensure all application state is cleared
      window.location.href = '/login';
    }
  };

  const continueAsGuest = () => {
    setUser(null);
    setIsGuest(true);
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    isGuest,
    login,
    signup,
    logout,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
