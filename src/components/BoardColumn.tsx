import { BoardColumn as BoardColumnType } from '@/types/jira';
import BoardCard from './BoardCard';

const headerColors: Record<string, string> = {
  planned: 'bg-col-planned/20 text-col-planned',
  todo: 'bg-col-todo/20 text-col-todo',
  inprogress: 'bg-col-progress/20 text-col-progress',
  done: 'bg-col-done/20 text-col-done',
};

export default function BoardColumnComponent({ column }: { column: BoardColumnType }) {
  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className={`rounded-t-lg px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-center ${headerColors[column.id]}`}>
        {column.title}
      </div>
      <div className="flex flex-col gap-2 rounded-b-lg bg-secondary/50 p-3 min-h-[200px] flex-1">
        {column.issues.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma demanda</p>
        )}
        {column.issues.map((issue) => (
          <BoardCard key={issue.id} issue={issue} columnId={column.id} />
        ))}
      </div>
    </div>
  );
}
