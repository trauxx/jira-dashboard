import { useMemo } from "react";
import { BoardColumn as BoardColumnType } from "@/types/jira";
import BoardCard from "./BoardCard";

const headerColors: Record<string, string> = {
  planned: "bg-col-planned/20 text-col-planned",
  todo: "bg-col-todo/20 text-col-todo",
  inprogress: "bg-col-progress/20 text-col-progress",
  done: "bg-col-done/20 text-col-done",
};

export default function BoardColumnComponent({
  column,
}: {
  column: BoardColumnType;
}) {
  const sortedIssues = useMemo(() => {
    return [...column.issues].sort((a, b) => {
      const aPoints =
        typeof a.storyPoints === "number"
          ? a.storyPoints
          : Number.NEGATIVE_INFINITY;
      const bPoints =
        typeof b.storyPoints === "number"
          ? b.storyPoints
          : Number.NEGATIVE_INFINITY;

      if (aPoints === bPoints) return 0;
      return aPoints > bPoints ? -1 : 1; // maior no topo
    });
  }, [column.issues]);

  return (
    <div className="flex flex-col w-full h-full">
      <div
        className={`rounded-t-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest ${headerColors[column.id]} flex items-center justify-between gap-2`}
      >
        <span>{column.title}</span>
      </div>
      <div className="flex flex-col gap-2 rounded-b-lg bg-secondary/50 p-3 min-h-[200px] flex-1">
        {column.issues.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma demanda
          </p>
        )}
        {sortedIssues.map((issue) => (
          <BoardCard key={issue.id} issue={issue} columnId={column.id} />
        ))}
      </div>
    </div>
  );
}
