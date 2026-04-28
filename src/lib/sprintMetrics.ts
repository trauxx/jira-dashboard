import type { BoardColumn } from "@/types/jira";

export function computeSprintMetrics(filteredColumns: BoardColumn[]) {
  const seen = new Set<string>();
  let totalIssues = 0;
  let totalSP = 0;

  let todo = 0;
  let inprog = 0;
  let done = 0;

  let todoSP = 0;
  let inprogSP = 0;
  let doneSP = 0;

  filteredColumns
    .filter((c) => c.id === "todo" || c.id === "inprogress" || c.id === "done")
    .forEach((col) => {
      col.issues.forEach((issue) => {
        if (seen.has(issue.id)) return;
        seen.add(issue.id);
        totalIssues += 1;
        const sp = typeof issue.storyPoints === "number" ? issue.storyPoints : 0;
        totalSP += sp;

        if (col.id === "todo") {
          todo += 1;
          todoSP += sp;
        }
        if (col.id === "inprogress") {
          inprog += 1;
          inprogSP += sp;
        }
        if (col.id === "done") {
          done += 1;
          doneSP += sp;
        }
      });
    });

  const denom = totalSP || totalIssues || 1;

  return {
    totalIssues,
    totalSP,
    todoCount: todo,
    todoSP,
    inProgressCount: inprog,
    inProgressSP: inprogSP,
    doneCount: done,
    doneSP,
    percTodo: Math.round((todoSP / denom) * 100),
    percInProgress: Math.round((inprogSP / denom) * 100),
    percDone: Math.round((doneSP / denom) * 100),
  };
}

export default computeSprintMetrics;
