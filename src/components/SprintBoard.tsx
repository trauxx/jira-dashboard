"use client";

import { useEffect, useState } from 'react';
import { JiraConfig } from '@/types/jira';
import { useJiraBoard, clearConfig } from '@/hooks/useJiraBoard';
import BoardColumnComponent from './BoardColumn';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogOut, Loader2 } from 'lucide-react';

interface Props {
  config: JiraConfig;
  onLogout: () => void;
}

export default function SprintBoard({ config, onLogout }: Props) {
  const { columns, loading, error, sprintName, fetchBoard } = useJiraBoard();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    fetchBoard(config);
  }, [config, fetchBoard]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    clearConfig();
    onLogout();
  };

  const dateStr = clock.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const totalIssues = columns.reduce((sum, c) => sum + c.issues.length, 0);

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold text-primary tracking-tight uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Sprint Atual
          </h1>
          {sprintName && (
            <p className="text-xs text-muted-foreground mt-0.5">{sprintName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase">
            {dateStr} — {timeStr}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchBoard(config)}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 text-xs">
        <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
          Demandas da Sprint: <strong className="text-foreground">{totalIssues}</strong>
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {columns.map((col) => (
          <BoardColumnComponent key={col.id} column={col} />
        ))}
      </div>
    </div>
  );
}
