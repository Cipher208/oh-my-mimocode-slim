/**
 * Phase reminder hook for MiMoCode.
 *
 * Injects workflow phase context into system prompt.
 * Based on oh-my-opencode-slim phase-reminder hook.
 *
 * Installation:
 *   cp hooks/phase-reminder.ts ~/.config/mimocode/hooks/
 */

const WORKFLOW_PHASES = {
  explore: "Discovery phase — gather context, understand the problem",
  plan: "Planning phase — design approach, identify dependencies",
  implement: "Implementation phase — write code, follow plan",
  verify: "Verification phase — run tests, check behavior",
  review: "Review phase — check quality, simplify, document",
}

export default {
  "experimental.chat.system.transform": async (
    input: { sessionID?: string; model: any },
    output: { system: string[] },
  ) => {
    // Inject workflow discipline reminder
    output.system.push(
      "## Workflow Discipline",
      "Before acting on a task:",
      "1. Understand the problem fully (explore)",
      "2. Plan your approach (plan)",
      "3. Implement with verification in mind (implement)",
      "4. Verify your changes (verify)",
      "5. Review for quality (review)",
      "Don't skip steps. Each phase catches different issues.",
    )
  },
}
