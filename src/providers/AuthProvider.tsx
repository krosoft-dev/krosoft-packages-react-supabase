import { useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../contexts/auth.context";
import { enrichUserWithMetadata } from "../helpers/auth.helper";

interface AuthProviderProps {
  client: SupabaseClient;
  children: React.ReactNode;
  navigate: (path: string) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  loginPath?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ client, children, navigate, onSuccess, onError, loginPath = "/auth/login" }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const clearAllData = (): void => {
    queryClient.clear();
  };

  const getLoginUrl = (redirectUrl?: string): string => {
    if (redirectUrl) {
      return `${loginPath}?redirect=${encodeURIComponent(redirectUrl)}`;
    }
    const currentPath = window.location.pathname;
    if (currentPath !== loginPath && currentPath !== "/") {
      return `${loginPath}?redirect=${encodeURIComponent(currentPath)}`;
    }
    return loginPath;
  };

  useEffect(() => {
    const initSession = async (): Promise<void> => {
      try {
        const { data, error } = await client.auth.getSession();

        if (error) {
          throw error;
        }

        if (data.session?.user) {
          setSession(data.session);
          setUser(enrichUserWithMetadata(data.session.user, data.session));
        } else {
          setSession(null);
          setUser(null);
        }
      } catch {
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      if (_event !== "INITIAL_SESSION") {
        clearAllData();
      }

      if (newSession?.user) {
        setSession(newSession);
        setUser(enrichUserWithMetadata(newSession.user, newSession));
      } else {
        setSession(null);
        setUser(null);
      }

      setIsLoading(false);
    });

    void initSession();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { data, error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      clearAllData();

      if (data.session && data.user) {
        setUser(enrichUserWithMetadata(data.user, data.session));
        setSession(data.session);
      }

      navigate("/");
      onSuccess?.("Connexion réussie");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de la connexion";
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) {
        throw error;
      }

      clearAllData();
      navigate("/");
      onSuccess?.("Inscription réussie");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'inscription";
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (redirectUrl?: string): Promise<void> => {
    try {
      setIsLoading(true);

      if (!session) {
        setUser(null);
        setSession(null);
        clearAllData();
        navigate(getLoginUrl(redirectUrl));
        onSuccess?.("Déconnexion réussie");
        return;
      }

      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      clearAllData();
      navigate(getLoginUrl(redirectUrl));
      onSuccess?.("Déconnexion réussie");
    } catch {
      setUser(null);
      setSession(null);
      clearAllData();
      navigate(getLoginUrl());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        getLoginUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
