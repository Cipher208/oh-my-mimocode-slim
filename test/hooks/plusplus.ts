/**
 * OpenCode++ sidecar hook for MiMoCode — full-featured reliability harness.
 *
 * Features (from whut09/opencode-plusplus):
 * - Command guard: dangerous commands, unknown npm/make/pyproject scripts
 * - Path guard: protected paths, secret files, generated dirs
 * - Output sanitizer: redacts API keys, JWTs, private keys
 * - Evidence recording: tool execution traces with hashes
 * - Idle-verify debounce: auto-verify after tool inactivity
 * - Policy engine: forbidden actions, risks, required evidence
 *
 * Installation:
 *   cp hooks/plusplus.ts ~/.config/mimocode/hooks/
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

const LOG = process.env.OPENCPP_LOG || "/tmp/plusplus-hook.log"
const projectDir = process.env.PROJECT_DIR || process.cwd()
const SIDECAR_DIR = join(projectDir, ".agent-context", "sidecar")

function log(msg: string) {
  if (LOG) writeFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`, { flag: "a" })
}

function ensureDir(dir: string) {
  try { mkdirSync(dir, { recursive: true }) } catch {}
}

// ─── Hash & Sanitize ──────────────────────────────────────────────────

function hashText(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) { h = ((h << 5) - h) + text.charCodeAt(i); h |= 0 }
  return h.toString(36)
}

const REDACT_PATTERNS: [RegExp, string][] = [
  [/(ghp_[A-Za-z0-9]{36})/g, "github_pat"],
  [/(gho_[A-Za-z0-9]{36})/g, "github_oauth"],
  [/(github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})/g, "github_fine_grained"],
  [/(sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20})/g, "openai_api_key"],
  [/(sk-ant-[A-Za-z0-9-]{20,})/g, "anthropic_api_key"],
  [/(AKIA[A-Z0-9]{16})/g, "aws_access_key"],
  [/(eyJhbGciOi[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g, "jwt_token"],
  [/("private_key"\s*:\s*"[^"]{20,}")/g, "private_key"],
  [/(Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,})/g, "auth_header"],
  [/(Authorization:\s*Basic\s+[A-Za-z0-9+/=]{20,})/g, "basic_auth"],
]

function sanitizeOutput(text: string): { sanitized: string; redacted: number } {
  let redacted = 0, sanitized = text
  for (const [p, r] of REDACT_PATTERNS) { const b = sanitized; sanitized = sanitized.replace(p, `[REDACTED:${r}]`); if (sanitized !== b) redacted++ }
  return { sanitized, redacted }
}

// ─── Command Guard ────────────────────────────────────────────────────

const DANGEROUS: [RegExp, string][] = [
  [/\brm\s+(-[^\s]*[rf][^\s]*|-[^\s]*r[^\s]*f[^\s]*|-[^\s]*f[^\s]*r[^\s]*)\s+(\/|\*|\.|~|\$HOME)/i, "destructive recursive remove"],
  [/\brm\s+-rf?\s+\/\s*$/i, "rm -rf /"],
  [/\bgit\s+reset\s+--hard\b/i, "hard git reset"],
  [/\bgit\s+clean\s+-[^\s]*[fd][^\s]*/i, "git clean removes untracked files"],
  [/\bgit\s+push\s+--force/i, "force push"],
  [/\bgit\s+push\s+-f\b/i, "force push"],
  [/\b(curl|wget)\b.+\|\s*(sh|bash|powershell|pwsh)\b/i, "remote script pipe to shell"],
  [/\bchmod\s+-R\s+777\b/i, "recursive world-writable permissions"],
  [/\bdel\s+\/[sfq]\s+(\\|\/|\*)/i, "destructive Windows delete"],
  [/\bdocker\s+rm\s+-f\s+--all/i, "remove all containers"],
  [/\bdocker\s+system\s+prune\s+-a/i, "prune all docker resources"],
]

function checkDangerous(cmd: string): { severity: string; message: string } | null {
  for (const [p, r] of DANGEROUS) if (p.test(cmd)) return { severity: "blocker", message: `Blocked: ${r}` }
  return null
}

// ─── Path Guard ───────────────────────────────────────────────────────

const SECRETS: [RegExp, string][] = [
  [/\.env(\.\w+)?$/, ".env"], [/credentials\.json$/, "credentials"], [/secrets\.ya?ml$/, "secrets"],
  [/id_rsa/, "SSH key"], [/\.ssh\//, "SSH dir"], [/\.gnupg\//, "GPG dir"],
  [/\.(pem|key|p12|pfx)$/, "cert/key"], [/\.kube\/config$/, "kubeconfig"],
  [/\.docker\/config\.json$/, "docker config"], [/\.npmrc$/, "npmrc"], [/\.netrc$/, "netrc"],
]

const PROTECTED: [RegExp, string][] = [
  [/\.git\//, "git"], [/node_modules\//, "node_modules"], [/\.cache\//, "cache"],
  [/\.agent-context\//, "generated"], [/\bdist\//, "build"], [/\bbuild\//, "build"],
  [/\bcoverage\//, "coverage"], [/__pycache__\//, "pycache"], [/\.next\//, "next.js"],
]

function checkPath(fp: string): { severity: string; message: string } | null {
  const n = fp.replace(/\\/g, "/")
  for (const [p, r] of SECRETS) if (p.test(n)) return { severity: "blocker", message: `Blocked (${r}): ${fp}` }
  for (const [p, r] of PROTECTED) if (p.test(n)) return { severity: "warn", message: `Warning: ${r}: ${fp}` }
  return null
}

// ─── Script/Target Validation ─────────────────────────────────────────

function checkNpm(cmd: string, cwd: string): { severity: string; message: string } | null {
  const m = cmd.match(/^(?:npm|yarn|pnpm)\s+(?:run\s+)?(\w+)/)
  if (!m) return null
  const s = m[1]
  if (["start","stop","test","install","publish","version","help","run"].includes(s)) return null
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"))
    if (pkg.scripts && s in pkg.scripts) return null
    return { severity: "blocker", message: `Script "${s}" not in package.json. Available: ${Object.keys(pkg.scripts||{}).join(", ")||"none"}` }
  } catch { return null }
}

function checkMake(cmd: string, cwd: string): { severity: string; message: string } | null {
  const m = cmd.match(/^(?:make|gmake)\s+(\S+)/)
  if (!m) return null
  const t = m[1]; if (t.startsWith("-")) return null
  try {
    const mk = readFileSync(join(cwd, "Makefile"), "utf8")
    const targets = [...mk.matchAll(/^(\w[\w-]*)\s*:/gm)].map(x => x[1])
    if (targets.includes(t)) return null
    return { severity: "blocker", message: `Make target "${t}" not found. Available: ${targets.join(", ")}` }
  } catch { return null }
}

// ─── Evidence Recording ───────────────────────────────────────────────

function recordEvidence(tool: string, args: any, output: any) {
  ensureDir(SIDECAR_DIR)
  const stdout = String(output?.stdout ?? output?.output ?? "")
  const stderr = String(output?.stderr ?? output?.error ?? "")
  const { sanitized: sc, redacted: sr } = sanitizeOutput(stdout)
  const { sanitized: ec, redacted: er } = sanitizeOutput(stderr)
  const entry = {
    timestamp: new Date().toISOString(), tool,
    exitCode: output?.exitCode ?? null,
    stdoutHash: hashText(sc), stdoutPreview: sc.slice(0, 200),
    stdoutTruncated: stdout.length > 10000, stdoutRedacted: sr > 0,
    stderrHash: hashText(ec), stderrRedacted: er > 0,
  }
  writeFileSync(join(SIDECAR_DIR, "evidence.jsonl"), JSON.stringify(entry) + "\n", { flag: "a" })
}

// ─── Idle-Verify Debounce ─────────────────────────────────────────────

let dirty = false, verifying = false, lastVerifyAt = 0, verifyTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 5000

function markDirty() { dirty = true }

function maybeVerify() {
  const now = Date.now()
  if (!dirty || verifying || (now - lastVerifyAt < DEBOUNCE_MS)) return
  verifying = true; dirty = false
  try { runPolicyCheck() } finally { verifying = false; lastVerifyAt = Date.now() }
}

function scheduleVerify() {
  if (verifyTimer) clearTimeout(verifyTimer)
  verifyTimer = setTimeout(maybeVerify, DEBOUNCE_MS)
}

// ─── Policy Engine (simplified) ───────────────────────────────────────

interface Finding { id: string; kind: "forbidden"|"risk"|"required"; status: "failed"|"warning"|"missing"|"satisfied"; message: string; file?: string; evidence: string[] }

function getChangedFiles(): string[] {
  try {
    const { execSync } = require("child_process")
    const out = execSync("git status --porcelain --untracked-files=all", { cwd: projectDir, encoding: "utf8", timeout: 5000, stdio: ["pipe", "pipe", "ignore"] })
    return out.split("\n").filter(l => l.length > 3).map(l => l.slice(3).trim().split(" -> ").pop()!).filter(Boolean)
  } catch { return [] }
}

function runPolicyCheck() {
  const findings: Finding[] = []
  const changed = getChangedFiles()

  // Forbidden: generated source changed directly
  for (const f of changed) {
    if (/\.agent-context\//.test(f) || f === "AGENTS.md") {
      findings.push({ id: "forbidden.generated", kind: "forbidden", status: "failed", message: `Generated file changed: ${f}`, file: f, evidence: ["Direct edit to generated output"] })
    }
    if (/(^|\/)(dist|build|coverage|\.next|out)\//.test(f)) {
      findings.push({ id: "forbidden.build", kind: "forbidden", status: "failed", message: `Build output changed: ${f}`, file: f, evidence: ["Direct edit to build artifact"] })
    }
  }

  // Risk: sensitive paths
  for (const f of changed) {
    if (/(^|\/)(auth|session|security|payment|billing)(\/|\.|-|_)/i.test(f)) {
      findings.push({ id: "risk.sensitive", kind: "risk", status: "warning", message: `Sensitive area changed: ${f}`, file: f, evidence: ["Auth/payment/security file modified"] })
    }
  }

  // Risk: large diff
  if (changed.length >= 10) {
    findings.push({ id: "risk.large-diff", kind: "risk", status: "warning", message: `${changed.length} files changed`, evidence: ["Large diff detected"] })
  }

  // Required: evidence exists
  const evidenceFile = join(SIDECAR_DIR, "evidence.jsonl")
  if (existsSync(evidenceFile)) {
    const lines = readFileSync(evidenceFile, "utf8").split("\n").filter(Boolean)
    const recentEvidence = lines.slice(-20)
    const hasTestEvidence = recentEvidence.some(l => l.includes('"tool":"bash"') && (l.includes("test") || l.includes("pytest") || l.includes("jest")))
    if (changed.some(f => /\.(ts|tsx|js|jsx|py|rs)$/.test(f)) && !hasTestEvidence) {
      findings.push({ id: "required.tests", kind: "required", status: "missing", message: "Source changes without test evidence", evidence: ["Run tests after source changes"] })
    }
  }

  // Log findings
  const blocked = findings.filter(f => f.kind === "forbidden" && f.status === "failed")
  const warnings = findings.filter(f => f.kind === "risk")
  const missing = findings.filter(f => f.kind === "required" && f.status === "missing")

  if (blocked.length || warnings.length || missing.length) {
    ensureDir(SIDECAR_DIR)
    const report = { timestamp: new Date().toISOString(), summary: { forbidden: blocked.length, risks: warnings.length, requiredMissing: missing.length }, findings }
    writeFileSync(join(SIDECAR_DIR, "policy-report.json"), JSON.stringify(report, null, 2))

    if (blocked.length) log(`POLICY BLOCKED: ${blocked.map(f => f.message).join("; ")}`)
    if (warnings.length) log(`POLICY WARN: ${warnings.map(f => f.message).join("; ")}`)
    if (missing.length) log(`POLICY MISSING: ${missing.map(f => f.message).join("; ")}`)
  }
}

// ─── Hook Implementation ──────────────────────────────────────────────

export default {
  "tool.execute.before": async (
    input: { tool: string },
    output: { args: any; cancel?: boolean; cancelReason?: string },
  ) => {
    const tool = input.tool?.toLowerCase()
    const args = output.args
    if (!args || typeof args !== "object") return

    // Command guard (bash/shell only)
    if (tool === "bash" || tool === "shell") {
      const cmd = args.command
      if (typeof cmd !== "string" || !cmd) return

      const danger = checkDangerous(cmd)
      if (danger) { log(`BLOCKED: ${danger.message}`); output.cancel = true; output.cancelReason = danger.message; return }

      const npm = checkNpm(cmd, projectDir)
      if (npm?.severity === "blocker") { log(`BLOCKED: ${npm.message}`); output.cancel = true; output.cancelReason = npm.message; return }

      const mk = checkMake(cmd, projectDir)
      if (mk?.severity === "blocker") { log(`BLOCKED: ${mk.message}`); output.cancel = true; output.cancelReason = mk.message; return }
    }

    // Path guard (write/edit tools)
    if (tool === "write" || tool === "edit") {
      const fp = args.file_path
      if (fp) {
        const pc = checkPath(fp)
        if (pc?.severity === "blocker") { log(`BLOCKED: ${pc.message}`); output.cancel = true; output.cancelReason = pc.message; return }
      }
    }
  },

  "tool.execute.after": async (
    input: { tool: string },
    output: { title: string; output: string; metadata: any },
  ) => {
    const tool = input.tool?.toLowerCase()
    const exitCode = output.metadata?.exitCode ?? null

    // Record evidence
    recordEvidence(tool, input, { stdout: output.output, exitCode })

    // Mark dirty on write/edit operations
    if (tool === "write" || tool === "edit") {
      markDirty()
      scheduleVerify()
    }

    if (exitCode !== 0 && exitCode !== null) {
      log(`TOOL_END: ${tool} exit=${exitCode}`)
    }
  },

  // Trigger verification on idle (no tool calls for DEBOUNCE_MS)
  "session.userQuery.post": async () => {
    maybeVerify()
  },
}
