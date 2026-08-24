import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthCredentials, MemberLoginCredentials, UserRole, UserSession } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: UserSession | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<boolean>;
  loginMember: (credentials: MemberLoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  updateUser: (partialUser: Partial<UserSession>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount directly from Supabase Auth & database or member session
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const existingSession = await authService.getSession();
        if (isMounted) {
          setUser(existingSession);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to real-time auth state changes
    const unsubscribe = authService.onAuthStateChange((updatedSession) => {
      if (isMounted) {
        setUser(updatedSession);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: AuthCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await authService.signIn(credentials);
      setUser(session);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Gagal masuk. Periksa kembali email dan password pengurus.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginMember = useCallback(async (credentials: MemberLoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await authService.signInMember(credentials);
      setUser(session);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Gagal masuk. Periksa kembali username dan password anggota.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setRole = useCallback((newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, role: newRole };
    });
  }, []);

  const updateUser = useCallback((partialUser: Partial<UserSession>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      if (updated.role === 'ANGGOTA') {
        authService.updateActiveMemberProfile({
          name: updated.name,
          gender: updated.gender,
          address: updated.address,
          city: updated.city,
          province: updated.province,
          occupation: updated.occupation,
          birthDate: updated.birthDate,
          birthPlace: updated.birthPlace,
        });
      }
      return updated;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const role: UserRole = user?.role || 'ANGGOTA';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        error,
        login,
        loginMember,
        logout,
        setRole,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

