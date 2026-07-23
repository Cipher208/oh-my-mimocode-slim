/**
 * Delegate task retry patterns.
 *
 * Error patterns and fix hints for task delegation failures.
 */

export interface DelegateErrorPattern {
  pattern: RegExp
  errorType: string
  fixHint: string
}

export const DELEGATE_TASK_ERROR_PATTERNS: DelegateErrorPattern[] = [
  {
    pattern: /agent not found|unknown agent|invalid agent/i,
    errorType: "agent_not_found",
    fixHint: "Check agent name. Use 'task list' to see available agents.",
  },
  {
    pattern: /task.*not found|unknown task|invalid task/i,
    errorType: "task_not_found",
    fixHint: "Check task ID. Use 'task list' to see available tasks.",
  },
  {
    pattern: /session.*not found|invalid session/i,
    errorType: "session_not_found",
    fixHint: "Session expired. Start a new session.",
  },
  {
    pattern: /timeout|timed out/i,
    errorType: "timeout",
    fixHint: "Task too long. Break into smaller parts or increase timeout.",
  },
  {
    pattern: /cancelled|aborted/i,
    errorType: "cancelled",
    fixHint: "Task was cancelled. Restart if needed.",
  },
  {
    pattern: /rate.?limit|429|too many requests/i,
    errorType: "rate_limit",
    fixHint: "Rate limited. Wait or switch model via /model.",
  },
  {
    pattern: /permission denied|access denied/i,
    errorType: "permission_denied",
    fixHint: "Insufficient permissions. Check tool access.",
  },
]

export function detectDelegateTaskError(output: string): { errorType: string; fixHint: string } | null {
  for (const p of DELEGATE_TASK_ERROR_PATTERNS) {
    if (p.pattern.test(output)) return { errorType: p.errorType, fixHint: p.fixHint }
  }
  return null
}
