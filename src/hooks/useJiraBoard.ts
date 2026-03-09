"use client";

import { useState, useCallback } from "react";
import { JiraConfig, JiraIssue, BoardColumn } from "@/types/jira";

const STORAGE_KEY = "jira-config";

export function getStoredConfig(): JiraConfig | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function storeConfig(config: JiraConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// Map Jira status names to our columns
function mapStatusToColumn(statusName: string): string {
  const lower = statusName.toLowerCase();

  if (
    lower.includes("done") ||
    lower.includes("conclu") ||
    lower.includes("fechad") ||
    lower.includes("resolved") ||
    lower.includes("closed")
  ) {
    return "done";
  }

  if (
    lower.includes("progress") ||
    lower.includes("andamento") ||
    lower.includes("in progress") ||
    lower.includes("desenvolvimento") ||
    lower.includes("revis") || // revisão PR/testes
    lower.includes("pr/test") ||
    lower.includes("validacao") ||
    lower.includes("validação") ||
    lower.includes("prod") ||
    lower.includes("entrave") ||
    lower.includes("imped") ||
    lower.includes("paraliz") ||
    lower.includes("paralis")
  ) {
    return "inprogress";
  }

  if (
    lower.includes("to do") ||
    lower.includes("a fazer") ||
    lower.includes("fazer") ||
    lower.includes("aberto") ||
    lower.includes("open") ||
    lower.includes("backlog")
  ) {
    return "todo";
  }

  if (
    lower.includes("planej") ||
    lower.includes("planned") ||
    lower.includes("new") ||
    lower.includes("novo")
  ) {
    return "planned";
  }

  return "todo";
}

export function useJiraBoard() {
  const [columns, setColumns] = useState<BoardColumn[]>([
    { id: "planned", title: "PLANEJADO", statuses: [], issues: [] },
    { id: "todo", title: "A FAZER", statuses: [], issues: [] },
    { id: "inprogress", title: "EM ANDAMENTO", statuses: [], issues: [] },
    { id: "done", title: "CONCLUÍDO", statuses: [], issues: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState<string>("");

  const fetchBoard = useCallback(async (config: JiraConfig) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        throw new Error(apiError || `Erro ao consultar o Jira (${res.status})`);
      }

      const data: {
        sprintName?: string;
        sprintStartDate?: string | null;
        issues: JiraIssue[];
      } = await res.json();

      setSprintName(data.sprintName || "Sem sprint ativa");
      const sprintStart = data.sprintStartDate
        ? new Date(data.sprintStartDate)
        : null;
      const issues = data.issues;

      // Distribute into columns
      const newColumns: BoardColumn[] = [
        { id: "planned", title: "PLANEJADO", statuses: [], issues: [] },
        { id: "todo", title: "A FAZER", statuses: [], issues: [] },
        { id: "inprogress", title: "EM ANDAMENTO", statuses: [], issues: [] },
        { id: "done", title: "CONCLUÍDO", statuses: [], issues: [] },
      ];

      issues.forEach((issue) => {
        const statusColumnId = mapStatusToColumn(issue.status);
        const statusColumn = newColumns.find((c) => c.id === statusColumnId);
        if (statusColumn) statusColumn.issues.push(issue);

        if (sprintStart && issue.created) {
          const created = new Date(issue.created);
          if (!Number.isNaN(created.getTime()) && created <= sprintStart) {
            const plannedColumn = newColumns.find((c) => c.id === "planned");
            if (plannedColumn) plannedColumn.issues.push(issue);
          }
        }
      });

      setColumns(newColumns);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  return { columns, loading, error, sprintName, fetchBoard };
}
