import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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
  const { i18n } = useTranslation();

  // Move the language detection logic to useCallback to avoid hook order issues
  const detectLanguageFromUser = useCallback((user: User) => {
    if (user?.user_metadata?.country && i18n?.changeLanguage) {
      const country = user.user_metadata.country;
      
      // Map countries to languages
      const countryLanguageMap: Record<string, string> = {
        'FR': 'fr', 'CA': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr',
        'MC': 'fr', 'SN': 'fr', 'CI': 'fr', 'ML': 'fr', 'BF': 'fr',
        // ... add more French-speaking countries
      };

      const detectedLanguage = countryLanguageMap[country] || 'en';
      
      // Only change language if it's different and user hasn't manually set it
      if (detectedLanguage !== i18n.resolvedLanguage && 
          localStorage.getItem('languageManuallySet') !== 'true') {
        
        console.log(`Auto-detecting language ${detectedLanguage} from country ${country}`);
        try {
          i18n.changeLanguage(detectedLanguage);
        } catch (error) {
          console.warn('Failed to change language:', error);
        }
      }
    }
  }, [i18n]);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Detect language for existing session
      if (session?.user) {
        detectLanguageFromUser(session.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [detectLanguageFromUser]); // Use the memoized callback

  const signIn = async (emailOrUsername: string, password: string) => {
    // Check if input is email or username
    const isEmail = emailOrUsername.includes('@');
    
    if (isEmail) {
      // Standard email login
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });
      return { error };
    } else {
      // Username login: try with constructed child email (username@child.local)
      const { error } = await supabase.auth.signInWithPassword({
        email: `${emailOrUsername}@child.local`,
        password,
      });
      
      if (error) {
        return { error: new Error('Invalid username or password') };
      }
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
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