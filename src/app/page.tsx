"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import SprintBoard from "@/components/SprintBoard";
import { JiraConfig } from "@/types/jira";
import { useAuth } from "@/hooks/useAuth";
import { getStoredConfig } from "@/hooks/useJiraBoard";

function HomeBoard() {
  const { logout } = useAuth();
  const [config, setConfig] = useState<JiraConfig | null>(null);

  // Config local sobrescreve as credenciais padrão do servidor (env)
  useEffect(() => {
    setConfig(getStoredConfig() ?? {});
  }, []);

  if (!config) return null;

  return <SprintBoard config={config} onLogout={logout} company="MB" />;
}

export default function HomePage() {
  return (
    <AuthGate>
      <HomeBoard />
    </AuthGate>
  );
}
