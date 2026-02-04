import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import authService from '../services/authService';
import type { User, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

interface AuthContextData {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión inicial
    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Manejar deep links para verificación de email
    const handleDeepLink = async (url: string) => {
      const { queryParams } = Linking.parse(url);
      
      if (queryParams?.access_token && queryParams?.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: queryParams.access_token as string,
          refresh_token: queryParams.refresh_token as string,
        });
        
        if (error) {
          console.error('Error setting session from deep link:', error);
        } else {
          console.log('Email verified successfully!');
        }
      }
    };

    // Verificar URL inicial (cuando la app se abre desde el link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Escuchar nuevos deep links (cuando la app ya está abierta)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const checkSession = async () => {
    try {
      const session = await authService.getSession();
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
