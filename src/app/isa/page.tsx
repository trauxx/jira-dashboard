"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import SprintBoard from "@/components/SprintBoard";
import { JiraConfig } from "@/types/jira";
import { useAuth } from "@/hooks/useAuth";
import { getStoredConfig } from "@/hooks/useJiraBoard";

function IsaBoard() {
  const { logout } = useAuth();
  const [config, setConfig] = useState<JiraConfig | null>(null);

  useEffect(() => {
    setConfig(getStoredConfig() ?? {});
  }, []);

  if (!config) return null;

  return <SprintBoard config={config} onLogout={logout} company="ISA" />;
}

export default function IsaPage() {
  return (
    <AuthGate>
      <IsaBoard />
    </AuthGate>
  );
}
