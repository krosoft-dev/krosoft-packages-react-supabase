import { useEffect, useRef, useState } from "react";
import type { Provider, Session, SupabaseClient, User } from "@supabase/supabase-js";
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
  const currentUserIdRef = useRef<string | null>(null);

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
          currentUserIdRef.current = data.session.user.id;
          setSession(data.session);
          setUser(enrichUserWithMetadata(data.session.user, data.session));
        } else {
          currentUserIdRef.current = null;
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
      const nextUserId = newSession?.user.id ?? null;

      // Seul un changement d'utilisateur — connexion, déconnexion, bascule de compte —
      // justifie de vider le cache. Les autres events portent le même utilisateur :
      // TOKEN_REFRESHED émis au retour sur l'onglet, USER_UPDATED, synchro entre onglets.
      // Y vider le cache remettrait toutes les requêtes en chargement, et les écrans
      // qui attendent leurs données pour s'afficher seraient démontés puis remontés,
      // perdant au passage leur état local : dialogs ouverts, filtres, saisie en cours.
      if (_event !== "INITIAL_SESSION" && currentUserIdRef.current !== nextUserId) {
        clearAllData();
      }
      currentUserIdRef.current = nextUserId;

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
        currentUserIdRef.current = data.user.id;
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

  const signInWithProvider = async (provider: Provider, redirectTo?: string): Promise<void> => {
    // La connexion OAuth redirige le navigateur vers le fournisseur : pas de navigate/setUser ici,
    // c'est onAuthStateChange qui prend le relais au retour de redirection.
    try {
      setIsLoading(true);
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo ?? `${window.location.origin}/` },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de la connexion";
      onError?.(message);
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
        currentUserIdRef.current = null;
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
      currentUserIdRef.current = null;
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
        signInWithProvider,
        signUp,
        signOut,
        getLoginUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
