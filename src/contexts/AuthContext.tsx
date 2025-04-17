import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/supabase';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { logActivity } from '../lib/activity';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (userData: Omit<User, 'id' | 'created_at' | 'is_verified'> & { password: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function fetchUser(userId: string) {
    try {
      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (userData) {
        // Fetch user subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (subscriptionError) throw subscriptionError;

        setUser({
          ...userData,
          subscription: subscriptionData
        });
      } else {
        console.warn('User not found in database.');
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Log login activity
      await logActivity('login');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      setUser(null); // Clear user state immediately
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      navigate('/'); // Still navigate to home even if sign-out fails
    }
  }

  async function signUp(userData: Omit<User, 'id' | 'created_at' | 'is_verified'> & { password: string }) {
    const { email, password, ...profile } = userData;

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Cette adresse email est déjà utilisée.');
      }

      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: null // Disable email redirect since we're using OTP
        }
      });

      if (authError) {
        if (authError.message.includes('rate limit')) {
          throw new Error('Veuillez patienter quelques secondes avant de réessayer.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('No user returned from sign-up');

      try {
        // Create the profile in the users table using admin client to bypass RLS
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email,
              ...profile,
              is_verified: false,
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) throw profileError;

        // Create initial subscription using admin client
        const { error: subscriptionError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert([
            {
              user_id: authData.user.id,
              status: 'trial',
              trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
            },
          ]);

        if (subscriptionError) throw subscriptionError;

        // Navigate to verify email page
        navigate('/verify-email');
      } catch (error) {
        // If profile creation fails, delete the auth user using admin client
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw error;
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  const authContextValue = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}