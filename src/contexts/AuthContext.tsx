import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/email";
import { clearNavigationHistory } from "@/components/layout/NavigationGuard";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithFacebook: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer profile creation with setTimeout to avoid deadlock
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(() => {
            const fullName = session.user.user_metadata?.full_name;
            createProfileIfNeeded(session.user, fullName);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name;
        createProfileIfNeeded(session.user, fullName);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createProfileIfNeeded = async (authUser: User, fullName?: string) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUser.id)
        .maybeSingle();

      if (fetchError && (fetchError as any).status === 406) {
        console.warn("Session points to non-existent user. Forcing logout.");
        signOut();
        return;
      }

      if (existingProfile) {
        // Se o perfil existe mas está sem foto ou nome (caso de migração), atualizamos
        const provider = authUser.app_metadata?.provider || 'email';
        const avatarUrlFromAuth = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        const fullNameFromAuth = fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name;

        // Recuperar dados atuais para ver se precisamos atualizar
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url, full_name, auth_provider, google_id")
          .eq("id", authUser.id)
          .single();

        const updates: any = {};
        if (!currentProfile?.avatar_url && avatarUrlFromAuth) updates.avatar_url = avatarUrlFromAuth;
        if (!currentProfile?.full_name && fullNameFromAuth) updates.full_name = fullNameFromAuth;
        if (!currentProfile?.auth_provider) updates.auth_provider = provider;
        if (!currentProfile?.google_id && provider === 'google') updates.google_id = authUser.id;

        if (Object.keys(updates).length > 0) {
          console.log("[Auth] Sincronizando metadados sociais para o perfil...");
          await supabase.from("profiles").update(updates).eq("id", authUser.id);
        }
      } else {
        const provider = authUser.app_metadata?.provider || 'email';
        const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

        const { error: insertError } = await supabase.from("profiles").insert({
          id: authUser.id,
          email: authUser.email || "",
          full_name: fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          avatar_url: avatarUrl || null,
          auth_provider: provider,
          google_id: provider === 'google' ? authUser.id : null,
          facebook_id: provider === 'facebook' ? authUser.id : null,
        });

        if (insertError) {
          console.error("Critical: Failed to create profile for existing session. DB might have been reset.", insertError);
          const status = (insertError as any).status;
          if (status === 403 || status === 401 || insertError.code === "42P01" || insertError.code === "42501") {
            console.warn("Corrupt session detected. Force logging out...");
            signOut();
          }
          return;
        }

        // Send welcome email for new users
        sendWelcomeEmail(authUser.id, authUser.email || "", fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name);
      }
    } catch (error: any) {
      console.error("Error creating profile:", error);
      if (error.status === 406 || error.status === 401) {
        signOut();
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Clear navigation history on successful login
    if (!error) {
      clearNavigationHistory();
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/dashboard`,
      },
    });

    if (!error) {
      clearNavigationHistory();
    }

    return { error: error as Error | null };
  };

  const signInWithFacebook = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth`,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithMagicLink = async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/auth`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error during Supabase signOut:", e);
    } finally {
      // Aggressively clear local storage keys related to supabase auth
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setSession(null);
      clearNavigationHistory();

      // Force a redirect to auth page if we are stuck
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithFacebook,
    signInWithMagicLink,
    signOut
  }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
