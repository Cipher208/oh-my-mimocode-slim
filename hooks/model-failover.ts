/**
 * Model failover hook for MiMoCode.
 *
 * Detects rate-limit errors and suggests alternative models.
 * Based on oh-my-opencode-slim foreground-fallback.
 *
 * Installation:
 *   cp hooks/model-failover.ts ~/.config/mimocode/hooks/
 */

const RATE_LIMIT_PATTERNS: [RegExp, string][] = [
  [/\b429\b/, "rate limit"],
  [/rate.?limit/i, "rate limit"],
  [/too many requests/i, "too many requests"],
  [/quota.?exceeded/i, "quota exceeded"],
  [/usage.?exceeded/i, "usage exceeded"],
  [/overloaded/i, "overloaded"],
  [/resource.?exhausted/i, "resource exhausted"],
  [/insufficient.?(quota|balance)/i, "insufficient quota"],
  [/high concurrency/i, "high concurrency"],
  [/\b403\b/, "forbidden"],
  [/forbidden/i, "forbidden"],
]

const FALLBACK_CHAIN = [
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.5-flash-lite",
  "moonshotai/kimi-k3",
]

function detectRateLimit(error: string): boolean {
  return RATE_LIMIT_PATTERNS.some(([p]) => p.test(error))
}

export default {
  "session.userQuery.post": async (
    input: { sessionID: string; finish?: string; error?: string },
    output: {},
  ) => {
    if (!input.error) return
    if (!detectRateLimit(input.error)) return

    const currentModel = process.env.MIMOCODE_MODEL || "unknown"
    const suggestions = FALLBACK_CHAIN.filter((m) => m !== currentModel).slice(0, 2)

    if (suggestions.length > 0) {
      console.log(`[model-failover] Rate limit detected. Consider switching model:`)
      console.log(`  Current: ${currentModel}`)
      console.log(`  Alternatives: ${suggestions.join(", ")}`)
      console.log(`  Use /model to switch.`)
    }
  },
}
