import { createContext, useContext, useState } from 'react';
import { User, Employee } from '../types';
import { authApi } from '../api/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type AuthUser = User & { employee?: Employee };

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const queryClient = useQueryClient();

  const { data: meData, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: !!token,
    retry: false,
  });

  const login = (newToken: string, userData: AuthUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Pre-fill the cache so we don't re-fetch
    queryClient.setQueryData(['auth', 'me'], {
      success: true,
      message: 'Cached',
      data: userData,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('dashboard_animated');
    setToken(null);
    queryClient.clear();
  };

  // meData is ApiResponse<MeResponse> where MeResponse is the user object directly
  const user: AuthUser | null = meData?.data ?? null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
