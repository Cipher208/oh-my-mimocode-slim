/**
 * JSON error recovery hook for MiMoCode.
 *
 * Detects common agent errors in tool output and appends recovery guidance.
 * Based on oh-my-opencode-slim json-error-recovery hook.
 *
 * Installation:
 *   cp hooks/json-recovery.ts ~/.config/mimocode/hooks/
 */

const JSON_ERROR_PATTERNS: [RegExp, string][] = [
  [/JSON\.parse\((.+?)\)/, "JSON parse error — check if output is valid JSON"],
  [/Unexpected token (.+?) in JSON/, "JSON syntax error near '$1'"],
  [/SyntaxError: Unexpected end of JSON input/, "Incomplete JSON — output may be truncated"],
  [/Cannot read propert(?:y|ies) of (?:undefined|null)/, "Accessing property on undefined — check object structure"],
  [/is not a function/, "Called non-function — check variable type"],
  [/ENOENT: no such file or directory/, "File not found — check path exists"],
  [/EACCES: permission denied/, "Permission denied — check file permissions"],
  [/MODULE_NOT_FOUND: Cannot find module/, "Module not found — check imports and dependencies"],
]

export default {
  "tool.execute.after": async (
    input: { tool: string },
    output: { title: string; output: string; metadata: any },
  ) => {
    const tool = input.tool?.toLowerCase()
    if (tool !== "bash" && tool !== "shell") return

    const stdout = output.output || ""
    const stderr = output.metadata?.stderr || ""
    const combined = `${stdout}\n${stderr}`

    for (const [pattern, hint] of JSON_ERROR_PATTERNS) {
      if (pattern.test(combined)) {
        output.output = `${output.output}\n\n[HINT] ${hint}`
        break
      }
    }
  },
}
