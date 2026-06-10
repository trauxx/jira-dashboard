"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import UserLoginForm from "@/components/UserLoginForm";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">
          Verificando sessão...
        </p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <UserLoginForm />;
  }

  return <>{children}</>;
}
