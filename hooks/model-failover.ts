/**
 * Model failover hook for MiMoCode.
 *
 * Detects rate-limit errors (429) and suggests alternative models.
 * Fires after each LLM step via session.userQuery.post.
 *
 * Installation:
 *   cp hooks/model-failover.ts ~/.config/mimocode/hooks/
 */

const RATE_LIMIT_PATTERNS: RegExp[] = [
  /\b429\b/,
  /rate.?limit/i,
  /too many requests/i,
  /quota.?exceeded/i,
  /usage.?exceeded/i,
  /overloaded/i,
  /resource.?exhausted/i,
  /insufficient.?(quota|balance)/i,
  /high concurrency/i,
  /monthly usage limit/i,
  /5-hour usage limit/i,
]

const FALLBACK_CHAIN: string[] = [
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.5-flash-lite",
  "moonshotai/kimi-k3",
]

function detectRateLimit(error: string): boolean {
  if (!error) return false
  return RATE_LIMIT_PATTERNS.some((p) => p.test(error))
}

function getSuggestions(currentModel: string): string[] {
  return FALLBACK_CHAIN.filter((m) => m !== currentModel).slice(0, 2)
}

export default {
  "session.userQuery.post": async (
    input: { sessionID: string; finish?: string; error?: string },
    _output: {},
  ) => {
    if (!input.error) return
    if (!detectRateLimit(input.error)) return

    const currentModel = process.env.MIMOCODE_MODEL || "deepseek/deepseek-v4-flash"
    const suggestions = getSuggestions(currentModel)

    if (suggestions.length > 0) {
      console.log(`[model-failover] Rate limit detected (${input.error.slice(0, 50)})`)
      console.log(`  Current model: ${currentModel}`)
      console.log(`  Try: ${suggestions.join(" or ")}`)
      console.log(`  Use /model to switch.`)
    }
  },
}
