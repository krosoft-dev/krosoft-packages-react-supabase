import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: (redirectUrl?: string) => Promise<void>;
  getLoginUrl: (redirectUrl?: string) => string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
