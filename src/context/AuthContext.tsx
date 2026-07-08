import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  currentAal: string | null;
  nextAal: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshAal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [nextAal, setNextAal] = useState<string | null>(null);

  const updateAal = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setCurrentAal(data?.currentLevel ?? null);
      setNextAal(data?.nextLevel ?? null);
    } catch {
      setCurrentAal(null);
      setNextAal(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer AAL check to avoid blocking state update
        setTimeout(() => updateAal(), 0);
      } else {
        setCurrentAal(null);
        setNextAal(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await updateAal();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [updateAal]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      await updateAal();
      // Log login event
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase.from('system_logs').insert({
            event_type: 'login',
            description: `Użytkownik ${email} zalogował się`,
            user_id: u.id,
          } as any);
        }
      } catch {}
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // Ta sama zasada co w resetPassword niżej — na sztywno coreplan.pl.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `https://coreplan.pl/reset-password` },
    });
    return { error };
  };

  const signOut = async () => {
    // Log logout event before signing out
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase.from('system_logs').insert({
          event_type: 'logout',
          description: `Użytkownik wylogował się`,
          user_id: u.id,
        } as any);
      }
    } catch {}
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // WAŻNE: na sztywno coreplan.pl, NIE window.location.origin. Dynamiczne
    // pochodzenie oznacza, że jeśli ktoś wywoła to z podglądu Lovable
    // (id-preview--<project>.lovable.app) albo dowolnej innej domeny
    // testowej, link w mailu wskaże na TĄ domenę, a nie na produkcję —
    // dokładnie tak wygenerował się myślący link do lovable.app, który
    // dostaliśmy do analizy. Spójne z create-org-user, create-org-member
    // i resend-user-invite, które już poprawnie hardkodują coreplan.pl.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://coreplan.pl/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      currentAal, nextAal,
      signIn, signUp, signOut, resetPassword,
      refreshAal: updateAal,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
