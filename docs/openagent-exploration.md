# oh-my-openagent Exploration Report

**Source:** https://github.com/code-yeongyu/oh-my-openagent  
**Clone:** /tmp/oh-my-openagent  
**Status:** PHASE 1 RESEARCH COMPLETE

## Quick Stats

- **52.3K AGENTS.md** — massive agent instructions
- **14.6K package.json** — 150+ scripts
- **137B .mcp.json** — minimal MCP config (only codegraph server)
- **43+ packages** — large monorepo
- **Multi-platform configs:** .opencode/, .claude/, .codex/, .cursor/, .agents/
- **13 project-scope skills** + 5 slash commands

## Structure Overview

```
/tmp/oh-my-openagent/
├── .opencode/          # OpenCode legacy config
├── .claude/            # Claude Code config (commands → .agents/command)
├── .codex/             # Codex config (setup.sh hook)
├── .cursor/            # Cursor config (environment.json)
├── .agents/            # NEW target: 13 skills + commands
├── .mcp.json           # MCP: only codegraph server
├── packages/           # 43 packages monorepo
├── tests/              # Root-level tests
└── test-support/       # Test utilities
```

## Phase 1: Repository Architecture (DONE)

### Monorepo Structure (43 packages)

**Core agent frameworks:**
- `omo-senpi/` — Main agent runtime (plugins, components, 16+ skills)
- `omo-opencode/` — OpenCode integration (160+ components, builtin agents)
- `omo-codex/` — Codex integration
- `omo-config-core/` — Configuration schema management
- `delegate-core/` — Subagent delegation system
- `team-core/` — Multi-agent team coordination
- `rules-engine/` — Dynamic rule evaluation
- `skills-loader-core/` — Skill discovery + loading
- `shared-skills/` — Reusable skills across platforms
- `model-core/` — LLM model management
- `mcp-client-core/` / `mcp-stdio-core/` — MCP protocol implementation
- `lsp-core/` + `lsp-daemon/` + `lsp-tools-mcp/` — LSP integration

**Platform bridges:**
- `claude-code-compat-core/` — Claude Code compatibility layer
- `openclaw-core/` — OpenClaw integration
- `boulder-state/` — State management
- `tmux-core/` — Tmux session management
- `telemetry-core/` — Metrics/telemetry
- `pi-goal/` + `pi-webfetch/` — Goal-oriented agents, web fetching
- `git-bash-mcp/` — Git bash MCP server
- `hashline-core/` — Hashing utilities
- `comment-checker-core/` — Code comment validation
- `web/` — Web dashboard UI

**Platform binaries (prebuilt):**
65+ `oh-my-openagent-*-*` binary packages for different platforms

### Phase-Specific Agents (omo-opencode/src/agents/)

| Agent | Purpose |
|-------|---------|
| **sisyphus** | General-purpose agent (main worker) |
| **sisyphus-junior** | Lightweight variant |
| **atlas** | Architectural decisions + mapping |
| **hephaestus** | Implementation specialist |
| **prometheus** | Visionary planning |
| **momus** | Critical evaluation |
| **metis** | Wisdom-based reasoning |
| **oracle** | Existing from slim |
| **librarian** | Existing from slim |
| **explore** | Codebase exploration |
| **multimodal-looker** | Vision analysis |

### Key Patterns Discovered

**1. Component Architecture (omo-senpi):**
```
packages/omo-senpi/src/
├── components/
│   ├── codegraph/          # Code intelligence
│   ├── comment-checker/    # Comment validation
│   ├── config-resolution/  # Config merging
│   ├── config-startup/     # Boot sequence
│   ├── config-watch/       # Live config reload
│   ├── fallback-architect/ # Model fallback when main fails
│   └── lsp/                # LSP daemon integration
└── skills/
    ├── give-me-tips/       # Explain senpi tips in-depth
    ├── hyperplan/          # Multi-agent planning
    ├── ultrawork/          # Batch processing
    ├── ulw-loop/           # Loop engineering
    └── ulw-research/       # Research automation
```

**2. Fallback Architect Pattern:**
When main agent/model fails, `fallback-architect` component:
- Detects refusal/failure
- Injects "Tip:" line in TUI
- Triggers alternative approach

**3. Dynamic Agent System:**
- `dynamic-agent-prompt-builder.ts` — Runtime prompt construction
- `agent-skill-resolution.ts` — Skill-to-agent assignment
- `builtin-agents.ts` — Factory functions for each agent type

### MCP Configuration

**`.mcp.json`:**
```json
{
  "mcpServers": {
    "codegraph": {
      "type": "stdio",
      "command": "codegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```
Minimal — relies on external MCP servers.

### Project-Scope Skills (.agents/skills/ — 13 skills)

| Skill | Also in .opencode? | Purpose |
|-------|-------------------|---------|
| work-with-pr/ | yes | Full PR lifecycle |
| work-with-pr-workspace/ | yes | Iteration workspace |
| github-triage/ | yes | Issue/PR triage |
| hyperplan/ | yes | Adversarial planning |
| pre-publish-review/ | yes | 16-agent release gate |
| get-unpublished-changes/ | NEW | Skill form of command |
| codex-qa/ | NEW | Codex QA testing |
| opencode-qa/ | NEW | OpenCode QA testing |
| remove-deadcode/ | yes (NEW as skill) | Code cleanup |
| security-research/ | yes | Security audit |
| tech-debt-audit/ | NEW | Technical debt analysis |

## Adaptation Candidates for MiMoCode

### HIGH Priority Adaptation:

1. **Hyperplan skill** — adversarial multi-agent planning
   - Dispatches multiple planning agents, compares approaches
   - Much more sophisticated than current compose:brainstorm

2. **Pre-publish review** — 16-agent release gate
   - Quality checks before publishing
   - Could integrate with our CI/CD

3. **Fallback architect pattern** — auto-recovery on model failure
   - When main LLM fails, suggest alternative approach
   - Complements our model-failover hook

### MEDIUM Priority:

4. **Ultrawork/Ulw-Loop** — batch processing + loop engineering
   - Automated iterative task execution
   - Matches our loop-engineering skill but more sophisticated

5. **Security research skill** — automated security audit patterns
   - Structured approach to vulnerability assessment

6. **Tech debt audit** — systematic technical debt analysis
   - Pattern-based debt detection

### LOW Priority (Too platform-specific):

- give-me-tips (senpi-specific tip explanations)
- codex-qa/opencode-qa (platform-specific QA)
- remove-deadcode (already have repowise)
- get-unpublished-changes (workflow-specific)

## Effort Estimates

| Component | Complexity | Effort | Priority for MiMoCode |
|-----------|------------|--------|----------------------|
| Hyperplan skill | High | 4-6h | 🔴 HIGH |
| Pre-publish review | High | 3-4h | 🔴 HIGH |
| Fallback architect | Medium | 2-3h | 🔴 HIGH |
| Ultrawork/Loop | Medium | 3h | 🟡 MEDIUM |
| Security research | Medium | 2h | 🟡 MEDIUM |
| Tech debt audit | Low | 2h | 🟡 MEDIUM |

## Next Steps

1. Deep dive into hyperplan skill (most novel)
2. Extract fallback architect pattern for model-failover hook upgrade
3. Analyze pre-publish review for CI/CD integration
4. Compare ulw-loop with our loop-engineering
