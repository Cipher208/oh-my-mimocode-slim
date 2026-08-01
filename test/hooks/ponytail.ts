/**
 * Ponytail hook for MiMoCode — lazy senior dev mode via file hooks.
 *
 * Injects YAGNI rules into system prompt and handles /ponytail commands.
 * Requires: ponytail rules in ~/.config/mimocode/ponytail/ or bundled.
 *
 * Installation:
 *   cp hooks/ponytail.ts ~/.config/mimocode/hooks/
 *   cp -r skills/ ~/.config/mimocode/ponytail/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

const MODES = ["off", "lite", "full", "ultra"] as const
type Mode = (typeof MODES)[number]

const CONFIG_DIR = join(
  process.env.XDG_CONFIG_HOME || join(process.env.HOME || "", ".config"),
  "mimocode",
  "ponytail",
)
const MODE_FILE = join(CONFIG_DIR, "mode")
const SKILLS_DIR = join(CONFIG_DIR, "skills")

const DEFAULT_MODE: Mode = "full"

function readMode(): Mode {
  try {
    const m = readFileSync(MODE_FILE, "utf8").trim() as Mode
    return MODES.includes(m) ? m : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

function writeMode(mode: Mode) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(MODE_FILE, mode)
}

function loadSkill(name: string): string {
  const path = join(SKILLS_DIR, `${name}.md`)
  try {
    return readFileSync(path, "utf8")
  } catch {
    return ""
  }
}

function stripFrontmatter(text: string): string {
  return text.replace(/^---[\s\S]*?---\s*/, "")
}

function filterByMode(body: string, mode: Mode): string {
  if (mode === "off") return ""
  if (mode === "lite") {
    return body
      .split("\n")
      .filter((line) => !line.match(/^\|\s*\*\*(ultra|full)\*\*\s*\|/))
      .join("\n")
  }
  return body
}

function buildContext(mode: Mode): string {
  if (mode === "off") return ""
  const skill = loadSkill("ponytail")
  if (!skill) return `PONYTAIL MODE ACTIVE — level: ${mode}`
  return `PONYTAIL MODE ACTIVE — level: ${mode}\n\n${filterByMode(stripFrontmatter(skill), mode)}`
}

export default {
  // Inject ponytail rules into system prompt before every LLM call
  "experimental.chat.system.transform": async (
    input: { sessionID?: string; model: any },
    output: { system: string[] },
  ) => {
    const mode = readMode()
    if (mode === "off") return
    const context = buildContext(mode)
    if (context) output.system.push(context)
  },

  // Handle /ponytail commands
  "tool.execute.before": async (
    input: { tool: string },
    output: { args: any },
  ) => {
    if (input.tool !== "bash" && input.tool !== "shell") return
    const args = output.args
    if (!args || typeof args !== "object") return
    const command = args.command
    if (typeof command !== "string") return

    const trimmed = command.trim()
    if (!trimmed.startsWith("/ponytail")) return

    const parts = trimmed.split(/\s+/)
    const subcommand = parts[1] || ""

    if (subcommand === "off" || subcommand === "lite" || subcommand === "full" || subcommand === "ultra") {
      writeMode(subcommand as Mode)
      args.command = `echo "Ponytail mode set to: ${subcommand}"`
    } else if (subcommand === "review" || subcommand === "audit" || subcommand === "debt" || subcommand === "gain" || subcommand === "help") {
      const skill = loadSkill(`ponytail-${subcommand}`)
      if (skill) {
        // Inject the skill content as a system message instead of executing as bash
        args.command = `echo "Load and follow the skill: ponytail-${subcommand}"`
      } else {
        args.command = `echo "Skill ponytail-${subcommand} not found"`
      }
    } else {
      // No argument or unknown — report current mode
      const mode = readMode()
      args.command = `echo "Ponytail mode: ${mode}. Use /ponytail [lite|full|ultra|off]"`
    }
  },
}
