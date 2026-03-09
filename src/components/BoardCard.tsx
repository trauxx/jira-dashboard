import { JiraIssue, ColumnStatus } from '@/types/jira';
import { CheckCircle2 } from 'lucide-react';

const statusColorMap: Record<ColumnStatus, string> = {
  planned: 'bg-col-planned',
  todo: 'bg-col-todo',
  inprogress: 'bg-col-progress',
  done: 'bg-col-done',
};

interface Props {
  issue: JiraIssue;
  columnId: ColumnStatus;
}

export default function BoardCard({ issue, columnId }: Props) {
  const isDone = columnId === 'done';

  return (
    <div
      className={`rounded-md px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${statusColorMap[columnId]} text-primary-foreground shadow-md transition-transform hover:scale-[1.02]`}
    >
      <span className="truncate flex-1">{issue.summary}</span>
      {isDone && <CheckCircle2 className="h-4 w-4 shrink-0 opacity-80" />}
      {issue.avatarUrl && (
        <img src={issue.avatarUrl} alt={issue.assignee || ''} className="h-5 w-5 rounded-full shrink-0" />
      )}
    </div>
  );
}
