"use client";

import { useEffect, useMemo, useState } from "react";
import { JiraConfig } from "@/types/jira";
import { useJiraBoard, clearConfig } from "@/hooks/useJiraBoard";
import BoardColumnComponent from "./BoardColumn";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import computeSprintMetrics from "@/lib/sprintMetrics";

const CAPACITY_BY_COMPANY = {
  MB: 227,
  ISA: 163,
  SYSTEM: 0,
} as const;

interface Props {
  config: JiraConfig;
  onLogout: () => void;
  company?: "ISA" | "MB" | "SYSTEM";
}

export default function SprintBoard({ config, onLogout, company }: Props) {
  const {
    columns,
    loading,
    error,
    sprintName,
    sprintEndDate,
    sprints,
    selectedSprintId,
    fetchBoard,
  } = useJiraBoard();
  const [clock, setClock] = useState(new Date());
  const [companyFilter, setCompanyFilter] = useState<"all" | "ISA" | "MB" | "SYSTEM">(
    company ?? "all",
  );

  useEffect(() => {
    if (company) {
      setCompanyFilter(company);
    }
  }, [company]);

  const totalCapacityHours = useMemo(() => {
    if (companyFilter === "all") {
      return CAPACITY_BY_COMPANY.MB + CAPACITY_BY_COMPANY.ISA + CAPACITY_BY_COMPANY.SYSTEM;
    }
    return CAPACITY_BY_COMPANY[companyFilter];
  }, [companyFilter]);

  useEffect(() => {
    fetchBoard(config);
  }, [config, fetchBoard]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBoard(config, selectedSprintId);
    }, 3600000);
    return () => clearInterval(interval);
  }, [config, selectedSprintId, fetchBoard]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    clearConfig();
    onLogout();
  };

  const handleSprintChange = (value: string) => {
    const numericSprintId = Number(value);
    if (Number.isNaN(numericSprintId)) return;
    fetchBoard(config, numericSprintId);
  };

  const storyPointsToHours = (points?: number | null) => {
    if (typeof points !== "number") return 0;
    return points * 4;
  };

  const getCompanyCategories = (labels: string[]) => {
    const categories = ["ISA", "MB", "SYSTEM"];
    return categories.filter((cat) =>
      labels.some((label) => label.toUpperCase() === cat),
    );
  };

  const dateStr = clock.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = clock.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const filteredColumns = useMemo(() => {
    if (companyFilter === "all") return columns;
    const target = companyFilter.toUpperCase();
    return columns.map((col) => ({
      ...col,
      issues: col.issues
        .filter((issue) =>
          (issue.labels ?? []).some((label) => label.toUpperCase() === target),
        )
        .map((issue) => ({
          ...issue,
          storyPoints:
            issue.storyPoints &&
            getCompanyCategories(issue.labels ?? []).length > 0
              ? issue.storyPoints / getCompanyCategories(issue.labels ?? []).length
              : issue.storyPoints,
        })),
    }));
  }, [columns, companyFilter]);

  const {
    totalIssues,
    totalSP,
    todoCount,
    todoSP,
    inProgressCount,
    inProgressSP,
    doneCount,
    doneSP,
    percTodo,
    percInProgress,
    percDone,
  } = useMemo(() => computeSprintMetrics(filteredColumns), [filteredColumns]);

  const addedAfterCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    filteredColumns.forEach((col) => {
      col.issues.forEach((issue) => {
        if (seen.has(issue.id)) return;
        seen.add(issue.id);
        if (issue.addedAfterPlanned) count += 1;
      });
    });
    return count;
  }, [filteredColumns]);

  const percentAddedOutsidePlan = totalIssues ? Math.round((addedAfterCount / totalIssues) * 100) : 0;

  const sprintDaysLeft = useMemo(() => {
    if (!sprintEndDate) return null;
    const end = new Date(sprintEndDate);
    if (Number.isNaN(end.getTime())) return null;
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [sprintEndDate]);

  const capacityChartConfig = {
    completed: { label: "Concluído", color: "#22c55e" },
    exceeding: { label: "Excedente", color: "#f97316" },
    remaining: { label: "Restante", color: "#e5e7eb" },
  } as const;

  // Determine currently selected sprint (fallback to active)
  const currentSprint = sprints.find((s) => s.id === selectedSprintId) ?? sprints.find((s) => s.state === "active") ?? null;
  const sprintStartStr = currentSprint && currentSprint.startDate ? new Date(currentSprint.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;
  const sprintEndStr = currentSprint && currentSprint.endDate ? new Date(currentSprint.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null;

  const {
    completedHours,
    remainingHours,
    capacityPercentage,
    capacityData,
    isExceeding,
  } = useMemo(() => {
    const doneColumn = filteredColumns.find((col) => col.id === "done");
    const completedHours = (doneColumn?.issues || []).reduce(
      (total, issue) => total + storyPointsToHours(issue.storyPoints),
      0,
    );

    const isExceeding = completedHours > totalCapacityHours;
    const remainingHours = isExceeding
      ? 0
      : totalCapacityHours - completedHours;
    const capacityPercentage = Math.round(
      (completedHours / totalCapacityHours) * 100,
    );

    return {
      completedHours,
      remainingHours,
      capacityPercentage,
      isExceeding,
      capacityData: isExceeding
        ? [
            {
              name: "completed",
              label: "Concluído",
              value: totalCapacityHours,
            },
            {
              name: "exceeding",
              label: "Excedente",
              value: completedHours - totalCapacityHours,
            },
          ]
        : [
            { name: "completed", label: "Concluído", value: completedHours },
            { name: "remaining", label: "Restante", value: remainingHours },
          ],
    };
  }, [filteredColumns, totalCapacityHours]);

  const visibleColumns = filteredColumns.filter((col) => col.id !== "planned");

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold text-primary tracking-tight uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Relatório de Sprint
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">
              Sprint
            </span>
            <Select
              value={selectedSprintId ? String(selectedSprintId) : undefined}
              onValueChange={handleSprintChange}
              disabled={loading || !sprints.length}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione a sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={String(sprint.id)}>
                    {sprint.name} {sprint.state === "active" ? "(Atual)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(sprintStartStr || sprintEndStr) && (
              <span className="text-xs text-muted-foreground ml-2">
                {sprintStartStr && sprintEndStr
                  ? `De ${sprintStartStr} a ${sprintEndStr}`
                  : sprintStartStr
                  ? `De ${sprintStartStr}`
                  : `Até ${sprintEndStr}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:ml-auto md:justify-end w-full md:w-auto">
          <div className="flex items-center gap-3 justify-end">
            <span className="text-xs text-muted-foreground uppercase text-right">
              {dateStr} — {timeStr}
            </span>
            {!company && (
              <Select
                value={companyFilter}
                onValueChange={(value) =>
                  setCompanyFilter(value as "all" | "ISA" | "MB" | "SYSTEM")
                }
                disabled={loading}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ISA">ISA</SelectItem>
                  <SelectItem value="MB">MB</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchBoard(config, selectedSprintId)}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
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
          <div className="w-full md:w-64 self-end bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Capacidade da sprint</span>
              <span className={isExceeding ? "text-orange-500" : ""}>
                {capacityPercentage}%
              </span>
            </div>
            <div className="relative h-36 mt-2">
              <ChartContainer
                config={capacityChartConfig}
                className="h-full w-full aspect-auto"
              >
                <PieChart>
                  <Pie
                    data={capacityData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {capacityData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "exceeding"
                            ? "#f97316"
                            : `var(--color-${entry.name})`
                        }
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {capacityPercentage}%
                </span>
                <span
                  className={`text-[11px] ${
                    isExceeding ? "text-orange-500" : "text-muted-foreground"
                  }`}
                >
                  {completedHours}h de {totalCapacityHours}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar + progress */}
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex flex-wrap gap-3">
          <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
            Demandas da Sprint:{" "}
            <strong className="text-foreground">{totalIssues} ({Math.round(totalSP)}sp)</strong>
          </span>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
            A Fazer: <strong className="text-foreground">{todoCount} ({Math.round(todoSP)}sp)</strong>
          </span>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
            Em Andamento:{" "}
            <strong className="text-foreground">{inProgressCount} ({Math.round(inProgressSP)}sp)</strong>
          </span>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
            Concluído: <strong className="text-foreground">{doneCount} ({Math.round(doneSP)}sp)</strong>
          </span>
          {sprintDaysLeft !== null && (
            <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
              {sprintDaysLeft > 0
                ? `${sprintDaysLeft} dia${sprintDaysLeft === 1 ? "" : "s"} restantes`
                : sprintDaysLeft === 0
                  ? "Encerra hoje"
                  : `Encerrada há ${Math.abs(sprintDaysLeft)} dia${Math.abs(sprintDaysLeft) === 1 ? "" : "s"}`}
            </span>
          )}

          {/* Percent of issues added after planning */}
          <span className="rounded-md bg-secondary px-3 py-1.5 text-muted-foreground">
            Fora do planejamento:{" "}
            <strong className="text-foreground">{percentAddedOutsidePlan}%</strong>
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div className="flex h-full w-full">
              <div
                className="h-full bg-col-todo"
                style={{ width: `${percTodo}%` }}
              />
              <div
                className="h-full bg-col-progress"
                style={{ width: `${percInProgress}%` }}
              />
              <div
                className="h-full bg-col-done"
                style={{ width: `${percDone}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>A Fazer: {percTodo}%</span>
            <span>Em Andamento: {percInProgress}%</span>
            <span>Concluído: {percDone}%</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Board */}
      <div
        className="grid gap-4 flex-1"
        style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(220px, 1fr))` }}
      >
        {visibleColumns.map((col) => (
          <BoardColumnComponent key={col.id} column={col} />
        ))}
      </div>
    </div>
  );
}
