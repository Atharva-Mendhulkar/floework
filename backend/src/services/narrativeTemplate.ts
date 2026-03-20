export interface NarrativeInput {
  completedTasks: { title: string; effort: string; focusHours: number }[];
  stalledTasks:   { title: string; daysStalled: number; reason?: 'pr_stalled' | string | null }[];
  focusStats:     { sessionCount: number; avgSessionMins: number; isPersonalBest: boolean };
  afterHoursFlag: boolean;
}

export function generateEffortNarrative(input: NarrativeInput): string {
  const parts: string[] = [];

  // Block 1: Task summary
  if (input.completedTasks.length === 0) {
    parts.push('No tasks were completed this week.');
  } else {
    const taskList = input.completedTasks.map(t =>
      `${t.title} (${t.effort}, ${t.focusHours.toFixed(1)} focus hours)`
    ).join(', ');
    const count = input.completedTasks.length;
    parts.push(`This week you completed ${count} task${count > 1 ? 's' : ''}: ${taskList}.`);
  }

  // Block 2: Stalls (only if present)
  if (input.stalledTasks.length > 0) {
    const s = input.stalledTasks[0];
    const reason = s.reason === 'pr_stalled' ? ' awaiting PR review' : '';
    parts.push(`One task is stalled — "${s.title}" has been in progress for ${s.daysStalled} day${s.daysStalled > 1 ? 's' : ''}${reason}.`);
  }

  // Block 3: Focus stats
  let focusLine = `Your focus this week: ${input.focusStats.sessionCount} session${input.focusStats.sessionCount !== 1 ? 's' : ''} averaging ${Math.round(input.focusStats.avgSessionMins)} minutes`;
  if (input.focusStats.isPersonalBest) focusLine += ', your best streak of the month';
  parts.push(focusLine + '.');

  // Block 4: After-hours
  parts.push(input.afterHoursFlag
    ? 'After-hours activity was logged this week.'
    : 'No after-hours activity logged.');

  return parts.join(' ');
}
