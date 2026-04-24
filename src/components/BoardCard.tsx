import { JiraIssue, ColumnStatus } from "@/types/jira";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import StoryPoints from "./StoryPoints";
import { getJiraIssueUrl } from "@/utils/jiraUrl";

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

export default function BoardCard({ issue, columnId }: Props) {
  const isDone = issue.normalizedStatus === "done" || columnId === "done";
  const isLate = issue.addedAfterPlanned === true;
  const jiraUrl = getJiraIssueUrl(issue);
  const cardContent = (
    <>
      <div className="flex flex-1 flex-wrap items-start gap-1 leading-snug">
        <span className="shrink-0 font-semibold underline-offset-2 hover:underline">
          {issue.key}
        </span>
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
    </>
  );

  if (jiraUrl) {
    return (
      <a
        href={jiraUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${issue.key}: ${issue.summary}`}
        className={`rounded-md px-3 py-2.5 text-sm font-medium flex items-start gap-2 ${statusColorMap[columnId]} text-primary-foreground shadow-md transition-transform hover:scale-[1.02] hover:no-underline`}
      >
        {cardContent}
      </a>
    );
  }

  // No Jira config found - cannot construct browse URL
  return (
    <div
      className={`rounded-md px-3 py-2.5 text-sm font-medium flex items-start gap-2 ${statusColorMap[columnId]} text-primary-foreground shadow-md transition-transform hover:scale-[1.02]`}
    >
      {cardContent}
    </div>
  );
}
