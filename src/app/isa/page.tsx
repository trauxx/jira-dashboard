"use client";

import { useEffect, useState } from "react";
import JiraLoginForm from "@/components/JiraLoginForm";
import SprintBoard from "@/components/SprintBoard";
import { JiraConfig } from "@/types/jira";
import { getStoredConfig } from "@/hooks/useJiraBoard";

export default function IsaPage() {
  const [config, setConfig] = useState<JiraConfig | null>(null);

  useEffect(() => {
    setConfig(getStoredConfig());
  }, []);

  if (!config) {
    return <JiraLoginForm onConnect={setConfig} />;
  }

  return <SprintBoard config={config} onLogout={() => setConfig(null)} company="ISA" />;
}