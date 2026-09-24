import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  

  // Language detection is handled by SimpleLanguageContext.
  // AuthContext no longer duplicates this to avoid drift between i18next and SimpleLanguageContext.
  const detectLanguageFromUser = useCallback((_user: User) => {
    // no-op – SimpleLanguageContext reads users.country directly
  }, []);

  const ensureAccountApproved = useCallback(async (authUser: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('approval_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      await supabase.auth.signOut();
      return new Error('We could not verify your account approval. Please try again.');
    }
    if (data?.approval_status === 'pending') {
      await supabase.auth.signOut();
      return new Error('Your account is waiting for administrator approval.');
    }
    if (data?.approval_status === 'rejected') {
      await supabase.auth.signOut();
      return new Error('Your account was not approved.');
    }
    return null;
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Detect language when user logs in
        if (session?.user) {
          detectLanguageFromUser(session.user);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const approvalError = await ensureAccountApproved(session.user);
        if (approvalError) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      
      // Detect language for existing session
      if (session?.user) {
        detectLanguageFromUser(session.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [detectLanguageFromUser, ensureAccountApproved]); // Use the memoized callbacks

  const signIn = async (emailOrUsername: string, password: string) => {
    // Check if input is email or username
    const isEmail = emailOrUsername.includes('@');
    
    if (isEmail) {
      // Standard email login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });
      if (error) return { error };
      return { error: data.user ? await ensureAccountApproved(data.user) : null };
    } else {
      const normalized = emailOrUsername.trim().toLowerCase();
      const tryStudent = await supabase.auth.signInWithPassword({
        email: `${normalized}@student.local`,
        password,
      });
      if (!tryStudent.error) {
        return { error: tryStudent.data.user ? await ensureAccountApproved(tryStudent.data.user) : null };
      }
      const tryChild = await supabase.auth.signInWithPassword({
        email: `${normalized}@child.local`,
        password,
      });
      if (!tryChild.error) {
        return { error: tryChild.data.user ? await ensureAccountApproved(tryChild.data.user) : null };
      }
      return { error: new Error('Invalid username or password') };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    // When email confirmation is disabled, signUp returns a session immediately.
    // Keep pending registrants out of the application until an admin approves them.
    if (!error && data.session) {
      await supabase.auth.signOut();
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async () => {
    if (!user || !session) {
      throw new Error('No user logged in');
    }

    // Call the delete-account edge function
    const { error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) {
      throw error;
    }

    // Show success message
    toast({
      title: "Account Deleted",
      description: "Your account has been successfully deleted. You will be signed out in a moment.",
    });

    // Wait 2.5 seconds before signing out to show the confirmation message
    setTimeout(async () => {
      await signOut();
    }, 2500);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
