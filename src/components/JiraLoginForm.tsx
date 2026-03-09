"use client";

import { useState } from 'react';
import { JiraConfig } from '@/types/jira';
import { getStoredConfig, storeConfig } from '@/hooks/useJiraBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onConnect: (config: JiraConfig) => void;
}

export default function JiraLoginForm({ onConnect }: Props) {
  const stored = getStoredConfig();
  const [domain, setDomain] = useState(stored?.domain || 'isa-meubilhete.atlassian.net');
  const [email, setEmail] = useState(stored?.email || '');
  const [apiToken, setApiToken] = useState(stored?.apiToken || '');
  const [boardId, setBoardId] = useState(stored?.boardId || '1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: JiraConfig = { domain, email, apiToken, boardId };
    storeConfig(config);
    onConnect(config);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-xl bg-card p-8 shadow-2xl border border-border"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Jira Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Conecte-se ao seu board Jira</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain" className="text-muted-foreground text-xs uppercase tracking-wider">Domínio Atlassian</Label>
          <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="empresa.atlassian.net" className="bg-secondary border-border text-foreground" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-secondary border-border text-foreground" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token" className="text-muted-foreground text-xs uppercase tracking-wider">API Token</Label>
          <Input id="token" type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Seu API token" className="bg-secondary border-border text-foreground" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="board" className="text-muted-foreground text-xs uppercase tracking-wider">Board ID</Label>
          <Input id="board" value={boardId} onChange={(e) => setBoardId(e.target.value)} placeholder="1" className="bg-secondary border-border text-foreground" />
        </div>

        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          Conectar
        </Button>
      </form>
    </div>
  );
}
