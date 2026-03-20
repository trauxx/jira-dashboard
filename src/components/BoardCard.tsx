import { JiraIssue, ColumnStatus } from "@/types/jira";
import { CheckCircle2 } from "lucide-react";

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
  const isDone = columnId === "done";

  return (
    <div
      className={`rounded-md px-3 py-2.5 text-sm font-medium flex items-start gap-2 ${statusColorMap[columnId]} text-primary-foreground shadow-md transition-transform hover:scale-[1.02]`}
    >
      <div className="flex flex-1 flex-wrap items-start gap-1 leading-snug">
        <a
          href={issue.browseUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-semibold underline-offset-2 hover:underline"
        >
          {issue.key}
        </a>
        <span className="shrink-0 opacity-80">-</span>
        <span className="flex-1 whitespace-normal break-words">
          {issue.summary}
        </span>
      </div>
      {isDone && (
        <CheckCircle2 className="h-4 w-4 shrink-0 self-start opacity-80" />
      )}
    </div>
  );
}
