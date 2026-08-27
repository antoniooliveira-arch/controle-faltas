import { supabase } from "@/lib/supabase";
import type { Escola, Usuario } from "@/types/supabase";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  email: string | undefined;
  nome: string | null;
  perfil: "ADMIN" | "ESCOLA";
  escolaId: number | null;
  escola: Escola | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSchool: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = async (authUserId: string): Promise<AuthUser | null> => {
    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (perfilError || !perfil) return null;
    const p = perfil as any;

    let escola: Escola | null = null;
    if (p.escola_id) {
      const { data: esc } = await supabase
        .from("escolas")
        .select("*")
        .eq("id", p.escola_id)
        .maybeSingle();
      escola = esc as Escola | null;
    }

    return {
      id: authUserId,
      email: p.email,
      nome: p.nome,
      perfil: p.perfil,
      escolaId: p.escola_id,
      escola,
    };
  };

  const refresh = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return;
    }
    const perfil = await fetchPerfil(authUser.id);
    setUser(perfil);
  };

  useEffect(() => {
    const getInitial = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const perfil = await fetchPerfil(authUser.id);
      setUser(perfil);
      setLoading(false);
    };

    getInitial();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const perfil = await fetchPerfil(session.user.id);
          setUser(perfil);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, _nome: string) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error("Erro ao criar conta.");
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.perfil === "ADMIN",
      isSchool: user?.perfil === "ESCOLA",
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
