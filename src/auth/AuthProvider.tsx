import { useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { AuthContext } from "./AuthContext";

interface AuthProviderProps {
  client: SupabaseClient;
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ client, children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};
