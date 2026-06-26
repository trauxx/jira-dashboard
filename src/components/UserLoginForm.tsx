"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TurnstileWidget from "@/components/TurnstileWidget";

export default function UserLoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!turnstileToken) {
      setError("Aguardando verificação de segurança");
      return;
    }

    setLoading(true);

    const result = await login(
      username,
      password,
      needsTwoFactor ? twoFactorCode : undefined,
      turnstileToken,
    );

    setLoading(false);
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);

    if (result.success) return;

    if (result.twoFactor) {
      setNeedsTwoFactor(true);
      setTwoFactorQrCode(result.twoFactorQrCode ?? null);
      return;
    }

    setError(result.error || "Erro ao autenticar");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-xl bg-card p-8 shadow-2xl border border-border"
      >
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Jira Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu usuário do painel
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="username"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Usuário ou email
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu.usuario"
            autoComplete="username"
            className="bg-secondary border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-muted-foreground text-xs uppercase tracking-wider"
          >
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            className="bg-secondary border-border text-foreground"
          />
        </div>

        {needsTwoFactor && (
          <div className="space-y-2">
            <Label
              htmlFor="twofactor"
              className="text-muted-foreground text-xs uppercase tracking-wider"
            >
              Código de verificação (2FA)
            </Label>
            {twoFactorQrCode && (
              <img
                src={twoFactorQrCode}
                alt="QR Code para configurar 2FA"
                className="mx-auto h-40 w-40 rounded bg-white p-1"
              />
            )}
            <Input
              id="twofactor"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="bg-secondary border-border text-foreground"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-center">
          <TurnstileWidget
            key={turnstileKey}
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          {loading ? "Autenticando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
