import { describe, it, expect } from "vitest";
import computeSprintMetrics from "@/lib/sprintMetrics";

const makeIssue = (id: string, sp: number | null, labels: string[] = []) => ({
  id,
  storyPoints: sp,
  labels,
});

describe("computeSprintMetrics", () => {
  it("sums story points per column and counts issues", () => {
    const columns: any = [
      { id: "todo", issues: [makeIssue("1", 3), makeIssue("2", 2)] },
      { id: "inprogress", issues: [makeIssue("3", 5)] },
      { id: "done", issues: [makeIssue("4", null)] },
    ];

    const res = computeSprintMetrics(columns);

    expect(res.totalIssues).toBe(4);
    expect(res.totalSP).toBe(10); // 3+2+5+0
    expect(res.todoSP).toBe(5);
    expect(res.inProgressSP).toBe(5);
    expect(res.doneSP).toBe(0);
  });

  it("percentages are 100% when all story points are in one column", () => {
    const columns: any = [
      { id: "todo", issues: [makeIssue("1", 0)] },
      { id: "inprogress", issues: [makeIssue("2", 8), makeIssue("3", 2)] },
      { id: "done", issues: [] },
    ];

    const res = computeSprintMetrics(columns);
    expect(res.totalSP).toBe(10);
    expect(res.percInProgress).toBe(100);
    expect(res.percTodo).toBe(0);
    expect(res.percDone).toBe(0);
  });

  it("handles zero story points by falling back to counts", () => {
    const columns: any = [
      { id: "todo", issues: [makeIssue("1", 0), makeIssue("2", 0)] },
      { id: "inprogress", issues: [makeIssue("3", 0)] },
      { id: "done", issues: [] },
    ];

    const res = computeSprintMetrics(columns);
    // totalSP is 0, denom falls back to totalIssues (3)
    expect(res.totalSP).toBe(0);
    expect(res.percTodo).toBe(Math.round((2 / 3) * 100));
    expect(res.percInProgress).toBe(Math.round((1 / 3) * 100));
  });
});
