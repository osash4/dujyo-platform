/**
 * Auth Context - Authentication state management for mobile
 * Handles login, logout, registration, and session management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';

export interface User {
  wallet_address: string;
  email: string;
  username?: string;
  user_type?: 'listener' | 'artist' | 'admin';
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;

  // Session management
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user session on app start
  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = useCallback(async () => {
    try {
      const [storedToken, storedUserData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (storedToken && storedUserData) {
        apiClient.setToken(storedToken);
        setToken(storedToken);
        setUser(JSON.parse(storedUserData));
      }
    } catch (error) {
      console.error('Error loading user session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      const { token: authToken, user: userData } = response;

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
      ]);

      // Update state
      apiClient.setToken(authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      // TODO: Implement Google Sign-In
      // For now, placeholder
      console.log('Google login - TODO: Implement');
      throw new Error('Google login not yet implemented');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    try {
      // TODO: Implement Apple Sign-In
      // For now, placeholder
      console.log('Apple login - TODO: Implement');
      throw new Error('Apple login not yet implemented');
    } catch (error) {
      console.error('Apple login error:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username?: string) => {
    try {
      const response = await apiClient.register(email, password, username);
      const { token: authToken, user: userData } = response;

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
      ]);

      // Update state
      apiClient.setToken(authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);

      // Clear API client token
      apiClient.setToken(null);

      // Update state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!token) return;

    try {
      // TODO: Implement token refresh endpoint
      // For now, just reload user data
      await loadUserSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
      // If refresh fails, logout user
      await logout();
    }
  }, [token, loadUserSession, logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    token,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    register,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

