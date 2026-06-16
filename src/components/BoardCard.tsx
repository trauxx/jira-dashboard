"use client";

import { useState } from "react";
import { JiraIssue, ColumnStatus } from "@/types/jira";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import StoryPoints from "./StoryPoints";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const statusColorMap: Record<ColumnStatus, string> = {
  planned: "bg-col-planned",
  todo: "bg-col-todo",
  inprogress: "bg-col-progress",
  done: "bg-col-done",
};

interface Props {
  issue: JiraIssue;
  columnId: ColumnStatus;
}

// Extrai apenas o número da chave do Jira (ex.: "ISAMB-123" -> "123")
function getIssueNumber(key: string): string {
  const match = key.match(/-(\d+)$/);
  return match ? match[1] : key;
}

export default function BoardCard({ issue, columnId }: Props) {
  const [open, setOpen] = useState(false);
  const isDone = issue.normalizedStatus === "done" || columnId === "done";
  const isLate = issue.addedAfterPlanned === true;
  const issueNumber = getIssueNumber(issue.key);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`#${issueNumber}: ${issue.summary}`}
        className={`w-full rounded-md px-3 py-2.5 text-left text-sm font-medium flex items-start gap-2 ${statusColorMap[columnId]} text-primary-foreground shadow-md transition-transform hover:scale-[1.02]`}
      >
        <div className="flex flex-1 flex-wrap items-start gap-1 leading-snug">
          <span className="shrink-0 font-semibold">#{issueNumber}</span>
          <span className="shrink-0 opacity-80">-</span>
          <span className="flex-1 whitespace-normal break-words">
            {issue.summary}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 self-start">
          {typeof issue.storyPoints === "number" && (
            <StoryPoints points={issue.storyPoints} />
          )}
          <div className="flex items-center gap-1">
            {isLate && (
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-400"
                aria-label="Entrou após o planejamento"
              />
            )}
            {isDone && <CheckCircle2 className="h-4 w-4 shrink-0 opacity-80" />}
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-2 text-left">
              <span className="shrink-0 font-semibold text-primary">
                #{issueNumber}
              </span>
              <span>{issue.summary}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Descrição da demanda #{issueNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
            {issue.description?.trim() ? (
              issue.description
            ) : (
              <span className="text-muted-foreground italic">
                Esta demanda não possui descrição.
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
