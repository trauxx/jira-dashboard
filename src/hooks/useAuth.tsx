"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AuthSession, AuthUser } from "@/types/jira";

const SESSION_KEY = "tickets-auth-session";
// Intervalo da verificação periódica do x-access-token na tickets-apiv2
const TOKEN_CHECK_INTERVAL_MS = 60_000;

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface LoginResult {
  success: boolean;
  twoFactor?: boolean;
  twoFactorQrCode?: string | null;
  twoFactorUrl?: string | null;
  error?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  login: (
    username: string,
    password: string,
    twoFactorCode?: string,
  ) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredSession(): AuthSession | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<AuthSession | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  const clearSession = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const validateToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.token) return;

    try {
      const res = await fetch("/api/auth/session", {
        headers: { "x-access-token": current.token },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        clearSession();
        return;
      }

      // Erros de rede/servidor (5xx) não derrubam a sessão
      if (res.ok) {
        setStatus("authenticated");
      }
    } catch {
      // Sem rede: mantém a sessão e tenta novamente no próximo ciclo
    }
  }, [clearSession]);

  // Restaura a sessão salva e valida o token na carga inicial
  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.token) {
      setStatus("unauthenticated");
      return;
    }

    setSession(stored);
    sessionRef.current = stored;
    setStatus("authenticated");
    validateToken();
  }, [validateToken]);

  // Verificação periódica do x-access-token + revalidação ao focar a aba
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(validateToken, TOKEN_CHECK_INTERVAL_MS);
    const onFocus = () => validateToken();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [status, validateToken]);

  const login = useCallback(
    async (
      username: string,
      password: string,
      twoFactorCode?: string,
    ): Promise<LoginResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, twoFactorCode }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data?.error || "Erro ao autenticar" };
        }

        if (data.twoFactor) {
          return {
            success: false,
            twoFactor: true,
            twoFactorQrCode: data.twoFactorQrCode,
            twoFactorUrl: data.twoFactorUrl,
          };
        }

        const newSession: AuthSession = { token: data.token, user: data.user };
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setStatus("authenticated");
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro desconhecido";
        return { success: false, error: message };
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        status,
        user: session?.user ?? null,
        token: session?.token ?? null,
        login,
        logout: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
