/**
 * /agent <name> slash command dispatcher for MiMoCode
 * Implements Priority 5 improvement: dispatch specialized agents via command
 */

import { writeFileSync } from "fs";

const LOG_FILE = "/tmp/agent-dispatch-hook.log";

function log(message: string): void {
  try {
    writeFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, "utf8", { flag: "a" });
  } catch {
    // best-effort
  }
}

// Agent → skill name mapping
const AGENT_SKILLS: Record<string, string> = {
  oracle: "oracle",
  librarian: "librarian",
  explorer: "explorer",
  fixer: "fixer",
  observer: "observer",
  designer: "designer",
  council: "council",
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  oracle: "Strategic technical advisor (architecture, code review, debugging)",
  librarian: "Research specialist (codebases, docs, examples)",
  explorer: "Codebase navigation specialist (grep, search, find)",
  fixer: "Implementation specialist (bug fixes, code changes)",
  observer: "Visual analysis specialist (images, screenshots, PDFs)",
  designer: "UI/UX specialist (design, prototyping, components)",
  council: "Multi-model consensus (dispatch 3-4 models in parallel)",
};

const AGENT_MODELS: Record<string, string> = {
  oracle: "deepseek/deepseek-v4-flash",
  librarian: "google/gemini-3.5-flash-lite",
  explorer: "deepseek/deepseek-v4-flash",
  fixer: "deepseek/deepseek-v4-flash",
  observer: "deepseek/deepseek-v4-flash",
  designer: "deepseek/deepseek-v4-flash",
  council: "deepseek/deepseek-v4-flash", // lead synthesizer
};

export default {
  "chat.message": async (input: { sessionID: string; message: string }, output: { message: string }) => {
    const message = input.message || "";
    
    // Match /agent <name> or /agent <name> "<task>"
    const match = message.match(/^\/agent\s+(\w+)(?:\s+"([^"]+)")?$/i);
    if (!match) return;

    const agentName = match[1].toLowerCase();
    const task = match[2] || message.substring(match[0].lastIndexOf('"') + 1);

    log(`dispatch: /agent ${agentName} — session=${input.sessionID}`);

    if (agentName === "list" || agentName === "help") {
      const agents = Object.keys(AGENT_SKILLS).map(name => `- **${name}**: ${AGENT_DESCRIPTIONS[name]}`);
      output.message = `## Available Agents\n\n${agents.join("\n")}\n\nUsage: \`/agent <name> "<task>"\``;
      return;
    }

    if (!AGENT_SKILLS[agentName]) {
      const available = Object.keys(AGENT_SKILLS).join(", ");
      output.message = `Unknown agent: ${agentName}\nAvailable: ${available}\nUse \`/agent list\` for details.`;
      return;
    }

    const skillName = AGENT_SKILLS[agentName];
    const model = AGENT_MODELS[agentName];

    // Redirect to the skill — MiMoCode will invoke the skill with the task
    log(`→ dispatching ${skillName} (${model})`);

    // Build the redirect command — MiMoCode will load the skill
    output.message = `/${skillName} ${task || "(enter task when prompted)"}`;
    log(`Redirected to /${skillName} with task: "${task || "N/A"}"`);
  },
};
