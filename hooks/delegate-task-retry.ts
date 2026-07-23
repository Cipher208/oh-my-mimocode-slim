/**
 * Delegate task retry hook for MiMoCode.
 *
 * Detects task delegation errors and appends retry guidance.
 * Based on oh-my-opencode-slim delegate-task-retry hook.
 *
 * Installation:
 *   cp hooks/delegate-task-retry.ts ~/.config/mimocode/hooks/
 */

const DELEGATE_ERROR_PATTERNS: [RegExp, string, string][] = [
  [
    /agent not found|unknown agent|invalid agent/i,
    "Agent not found",
    "Check available agents. Common agents: general, explore, summary, title.",
  ],
  [
    /task.*not found|unknown task|invalid task/i,
    "Task not found",
    "Check task ID. Use 'task list' to see available tasks.",
  ],
  [
    /session.*not found|invalid session/i,
    "Session not found",
    "The session may have expired. Start a new session.",
  ],
  [
    /timeout|timed out/i,
    "Agent timeout",
    "Task took too long. Try breaking into smaller parts or increasing timeout.",
  ],
  [
    /cancelled|aborted/i,
    "Task cancelled",
    "Task was cancelled. Restart if needed.",
  ],
]

function detectDelegateError(output: string): { errorType: string; fixHint: string } | null {
  for (const [pattern, errorType, fixHint] of DELEGATE_ERROR_PATTERNS) {
    if (pattern.test(output)) return { errorType, fixHint }
  }
  return null
}

function extractAvailableList(output: string): string | null {
  const match = output.match(/Available agents?:\s*(.+)$/m)
  if (match) return match[1].trim()
  return null
}

export default {
  "tool.execute.after": async (
    input: { tool: string },
    output: { title: string; output: string; metadata: any },
  ) => {
    const tool = input.tool?.toLowerCase()
    if (tool !== "actor" && tool !== "subagent") return

    const errorInfo = detectDelegateError(output.output || "")
    if (!errorInfo) return

    const available = extractAvailableList(output.output || "")
    const lines = [
      "",
      "[delegate-task retry suggestion]",
      `Error: ${errorInfo.errorType}`,
      `Fix: ${errorInfo.fixHint}`,
    ]
    if (available) lines.push(`Available: ${available}`)
    lines.push("Retry with corrected parameters.")

    output.output = `${output.output}\n${lines.join("\n")}`
  },
}
