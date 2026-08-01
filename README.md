# oh-my-mimocode-slim

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MiMoCode](https://img.shields.io/badge/MiMoCode-%3E%3D0.38.0-blue.svg)](https://github.com/nicepkg/mimocode)

> Comprehensive MiMoCode enhancement suite — adapted from oh-my-opencode-slim + oh-my-openagent.

Multi-agent orchestration, intelligent web fetch, AST code search, error recovery, and A/B prompt testing — all via MiMoCode file hooks and skills.

## Quick Start

```bash
git clone https://github.com/Cipher208/oh-my-mimocode-slim.git /tmp/oh-my-mimocode-slim
cp /tmp/oh-my-mimocode-slim/hooks/*.ts ~/.config/mimocode/hooks/
cp /tmp/oh-my-mimocode-slim/skills/*.md ~/.local/share/mimocode/skills-native/
```

Restart MiMoCode. Done.

## Features

### Skills (13)

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **orchestrator-routing** | Task delegation rules | Complex tasks needing specialization |
| **loop-engineering** | Execute-verify loops | Iterative tasks with success criteria |
| **codemap** | Codebase structure mapping | Understanding new codebases |
| **reflect** | Session review | After complex tasks |
| **simplify** | Code simplification | Code is too complex |
| **verification-planning** | Pre-implementation planning | Before any implementation |
| **council** | Multi-model consensus | High-stakes decisions, architecture choices |
| **oracle** | Strategic technical advisor | Architecture decisions, code review |
| **librarian** | Research specialist | Codebase/docs lookup, examples |
| **explorer** | Codebase navigation | Find files, grep patterns |
| **fixer** | Implementation specialist | Bug fixes, code changes |
| **observer** | Visual analyst | Screenshots, PDFs, diagrams |
| **designer** | UI/UX specialist | Design, prototyping, components |

### Hooks (6)

| Hook | Purpose | When it fires |
|------|---------|---------------|
| **json-recovery** | Error recovery hints | After tool execution |
| **model-failover** | Model fallback chain | After LLM errors (429, timeout) |
| **delegate-task-retry** | Delegation retry guide | After actor/subagent failure |
| **phase-reminder** | TDD discipline reminder | Before every LLM call |
| **agent-dispatch** | `/agent <name>` router | On chat.message (slash commands) |
| **rules-discovery** | AGENTS.md discovery | On session.start (walk-up rules) |

### Tools (1)

| Tool | Purpose |
|------|---------|
| **smartfetch** | Intelligent web fetch with caching, HTML→MD, llms.txt probing |

### Agent System

| Component | Purpose |
|-----------|---------|
| **agent-prompts.json** | Centralized prompt registry for all agents |
| **prompt-loader.mjs** | CLI + variable injection (`{question}`, `{seat}`, `{persona}`, `{current_dir}`) |
| **7 agent types** | oracle, librarian, explorer, fixer, observer, designer, council |
| **4 councillor seats** | alpha/beta/gamma/delta with different models + personas |

**Usage:**
```bash
# Dispatch specialized agent
/agent oracle "Review MCP error handling"
/agent council "Should we adopt smartfetch?"

# Load prompts with variables
bun scripts/prompt-loader.mjs oracle "Your question" --var:seat=alpha
```

## Orchestrator Routing

Automatic task delegation based on what the task needs:

| Task Type | Delegate To | When |
|-----------|-------------|------|
| Codebase search | `fan-method` skill | Need to discover what exists |
| External docs | `deep-research`, `agent-reach` | Library APIs, version-specific |
| Architecture review | `software-architect` | Major decisions, debugging |
| UI/UX work | `frontend-design`, `product-design` | User-facing interfaces |
| Implementation | `senior-python`, `senior-systems` | Bounded, well-defined tasks |

## Loop Engineering

Execute-verify loops with configurable success criteria:

```
1. Execute: Run the task
2. Verify: Check success criteria
3. If pass: Done
4. If fail: Analyze, fix, retry
5. Max attempts reached: Escalate
```

## Installation Options

### Full install (all features)

```bash
cp /tmp/oh-my-mimocode-slim/hooks/*.ts ~/.config/mimocode/hooks/
cp /tmp/oh-my-mimocode-slim/skills/*.md ~/.local/share/mimocode/skills-native/
```

### Selective install

Pick what you need:
- **Hooks:** model-failover (19 error patterns + 7-level fallback), agent-dispatch (`/agent name`), rules-discovery (AGENTS.md walk-up), image-hook, json-recovery, phase-reminder, delegate-task-retry
- **Skills:** council (multi-model consensus), oracle/librarian/explorer/fixer/observer/designer agents (all with structured permissions)
- **Tools:** smartfetch (caching + metadata + secondary-model), ast-grep (25 languages), cancel-task
- **Scripts:** prompt-loader (centralized prompts + inheritance + A/B testing)

### Quick Examples

```bash
# Multi-model consensus
/agent council "Should we use context-mode MCP for this project?"

# Dispatch specialized agent
/agent oracle "Review the plugin system architecture"

# Intelligent web fetch with caching
smartfetch https://example.com/docs --prompt "Summarize key points" --secondary-model gemini-flash

# AST code search
ast-grep search "export async function \$NAME" typescript

# Cancel stuck task
/cancel-task abc123-session "User aborted — switching approach"
```

## Prompt System

Central configuration in `agent-prompts.json`:

```bash
# Load prompt with variables + versioning
bun scripts/prompt-loader.mjs oracle "Review MCP hooks" --var:seat=alpha --version=v1.1

# A/B testing
bun scripts/prompt-loader.mjs oracle "question" --ab-test=v1.1-experimental

# Metrics logged to /tmp/prompt-ab-metrics.log
```

See agent-prompts.json for:
- 7 agent prompt templates (oracle, librarian, explorer, fixer, observer, designer, council)
- 4 councillor seats (alpha/beta/gamma/delta with different models)
- A/B testing variants + traffic splits
- Metrics logging config

## Architecture

- **`ADAPTATION_PLAN.md`** — full adaptation roadmap (all complete)
- **`docs/`** — research reports (agent orchestration, openagent survey)
- **`agent-prompts.json`** — centralized prompt registry
- **`scripts/prompt-loader.mjs`** — CLI tool for prompt resolution
- **Hooks** — fire on MiMoCode events (session.start, chat.message, tool.execute.after)
- **Skills** — loaded by MiMoCode as markdown with frontmatter config

## Testing

```bash
bun install
bun test        # 210 tests, 414 assertions
```

## Based on

- [alvinunreal/oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) (7.3k ⭐) — orchestrator, agents, tools
- [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) (66.5k ⭐) — ultrawork, team mode concepts
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — YAGNI lazy coding

## License

MIT
