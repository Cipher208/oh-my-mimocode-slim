# oh-my-opencode-slim → oh-my-mimocode-slim Adaptation Plan

## Summary of Findings

Research of https://github.com/alvinunreal/oh-my-opencode-slim revealed 10 high-value component categories for adaptation to MiMoCode (updated after brainstorm — foreground-fallback, auto-update-checker, and filter-available-skills excluded as too heavy / low ROI). Council consensus skill added as Priority 1.

---

## Priority 1: HIGH — Council Consensus Skill (NEW!)

**Inspiration:** `alvinunreal/oh-my-opencode-slim/src/agents/{council,councillor,orchestrator}.ts` (26.9K+ lines)

**What it does:**
Multi-model consensus pattern — dispatch 3-4 different models (deepseek, gemini, kimi) in parallel as subagents, each with the same prompt, then synthesize their responses into a structured council report.

**Key patterns from slim:**
- Councillor seats: alpha, beta, gamma, delta (different models)
- Council agent (no tools) receives all councillor responses
- Synthesis: agreements → contradictions → resolution → final answer
- Required output format:
  ```
  ## Council Response
  ## Per-Councillor Details (alpha, beta, gamma, delta)
  ## Council Summary (Consensus, Agreed Points, Disagreements, Recommended Action)
  ```

**Adaptation for MiMoCode:**
1. Create `skills-native/council.md` Skill
2. Implement as `/council "question"` slash command
3. Use `delegate_task` to dispatch 3 models in parallel (deepseek-v4-flash, gemini-flash, kimi-k3)
4. Synthesize responses via prompt injection
5. No tools for council agent — pure text synthesis

**Effort:** 2-3 hours (lightweight, high-impact)

---

## Priority 2: HIGH — Agent Orchestration System

**Source:** `/tmp/oh-my-opencode-slim/src/agents/`
- `index.ts` — agent registry & factory (368+ lines)
- `orchestrator.ts` — main orchestrator agent (21.5K lines)
- 9 specialized agents: council, councillor, designer, explorer, fixer, librarian, observer, oracle
- Tests: `orchestrator.test.ts` (1.4K), `index.test.ts` (36.5K), others

**What it does:**
9 специализированных агентов с разными ролями:
- **oracle** — strategic advisor, code review, architecture decisions
- **librarian** — research & docs (context7, GitHub)
- **explorer** — codebase navigation (grep, ast_grep, glob)
- **fixer** — implementation specialist (no research)
- **designer** — UI/UX specialist
- **observer** — visual analysis (screenshots, PDFs)
- **council/councillor** — многомодельный consensus (multiple LLMs voting)
- **orchestrator** — dispatches agents, manages flow

**Agent types:**
```typescript
export const ALL_AGENT_NAMES = [
  "explorer", "librarian", "oracle", "designer", 
  "fixer", "observer", "council", "councillor",
  ...SUBAGENT_NAMES  // built-in: edit, test, etc
]
```

**Key patterns:**
- `AgentDefinition` interface: name, displayName, description, config, model override
- `resolvePrompt()` — base/custom/append prompt resolution
- `Permission model` per agent (read-only vs writable)
- Councillor seats: alpha, beta, gamma, delta (multiple models simultaneously)

**Adaptation for MiMoCode:**
1. Create `mimocode-agents/` skill directory
2. Convert agent prompts → MiMoCode skills (oracle, librarian, explorer, fixer already exist!)
3. Implement council consensus pattern as skill chain
4. Add `/agent <name>` slash command

**Adaptation for MiMoCode:**
1. Formalize existing skills (oracle, librarian, explorer) with proper prompts
2. Create `skills/native/fixer.md` and `skills/native/observer.md`
3. Implement council consensus as skill chain (covered by Priority 1)
4. Add `/agent <name>` slash command for direct dispatch

**Effort:** 4-5 hours (formalization + fixer/observer)

---

## Priority 3: HIGH — smartfetch Tools (Intelligent Web Fetch)
  - `isFailoverError()` — error pattern classification
  - `isRetryableError()` — retry eligibility
  - `ForegroundFallbackManager` — state machine for model switching

**Adaptation plan:**
1. Create `mimocode-foreground-fallback.ts` hook
2. Map OpenCode error patterns → MiMoCode error patterns
3. Adapt FALLBACK_CHAIN: deepseek → gemini → kimi-v3 (per current config)
4. Test with simulated rate-limit errors

**Effort:** 3-4 hours (complex but highest value)

---

## Priority 3: HIGH — smartfetch Tools (Intelligent Web Fetch)

**Source:** `/tmp/oh-my-opencode-slim/src/tools/smartfetch/`
- `tool.ts` — 31.9K lines
- `network.ts` — 18K lines
- **What it does:** Smart web fetching with:
  - Content caching (SQLite/Redis)
  - Secondary model fallback for complex content
  - Content type detection and conversion
  - Rate limiting and retry logic

**Adaptation plan:**
1. Create MiMoCode TUI tool `smartfetch`
2. Integrate with existing context-mode MCP for indexing
3. Adapt OpenCode tool schema → MiMoCode tool definition
4. Test with various URLs

**Effort:** 4-5 hours

---

## Priority 4: HIGH — ast-grep Tools (AST Code Intelligence)

**Source:** `/tmp/oh-my-opencode-slim/src/tools/ast-grep/`
- `tool.ts` — search/replace via AST patterns
- `cli.ts` — CLI wrapper
- `constants.ts` — language configs
- **What it does:** Semantic code search and modification across 10+ languages

**Adaptation plan:**
1. Create MiMoCode tool `ast-grep` 
2. Bundle `ast-grep` binary or use system install
3. Map schema patterns → MiMoCode tool args
4. Integrate with codemap skill for context-aware suggestions

**Effort:** 3 hours

---

## Priority 4: MEDIUM — Image Hook

**Source:** `/tmp/oh-my-opencode-slim/src/hooks/image-hook.ts` (8.3K lines)
- **What it does:** Processes image attachments in chat — base64 encoding, metadata extraction, size optimization
- Hooks into `tool.execute.before` to intercept image data

**Adaptation plan:**
1. Create `mimocode-image-hook.ts`
2. Adapt for MiMoCode attachment types
3. Add image size logging + optimization hints

**Effort:** 2 hours

---

## Priority 5: MEDIUM — Deepwork Skill

**Source:** `/tmp/oh-my-opencode-slim/src/skills/deepwork/`
- **What it does:** Focus mode that minimizes distractions:
  - Hides low-priority notifications
  - Extends session timeouts
  - Reduces tool suggestions
  - Enforces single-task focus

**Adaptation plan:**
1. Create `skills-native/deepwork.md`
2. Implement slash command `/deepwork on/off`
3. Configure via MiMoCode settings

**Effort:** 2 hours

---

## Priority 6: MEDIUM — Worktrees Skill

**Source:** `/tmp/oh-my-opencode-slim/src/skills/worktrees/`
- **What it does:** Git worktree management for isolated feature branches
- Integration with task sessions

**Adaptation plan:**
1. Create `skills-native/worktrees.md`
2. Provide commands: `/worktree create`, `/worktree switch`, `/worktree remove`
3. Use existing `rtk git worktree` under the hood

**Effort:** 2 hours

---

## Priority 7: LOW — Other Tools

| Tool | Source | Purpose | Effort |
|------|--------|---------|--------|
| **cancel-task** | `src/tools/cancel-task.ts` (16.2K) | Advanced task cancellation with graceful shutdown | 1h |
| **acp-run** | `src/tools/acp-run.ts` (13.4K) | Agent Client Protocol runner | 2h |
| **wait-for-user** | `src/tools/wait-for-user.ts` (2.3K) | Wait for user approval during tool execution | 0.5h |

---

## Priority 8: LOW — Other Hooks

| Hook | Source | Purpose | Effort |
|------|--------|---------|--------|
| **image-hook** | `image-hook.ts` (8.3K) | Image attachment processing | 2h ✅ see Priority 4 |
| **post-file-tool-nudge** | `post-file-tool-nudge/` | Post-tool workflow hints | 1h |
| **task-session-manager** | `task-session-manager/` | Task session lifecycle | 2h |
| **cache-monitor** | `cache-monitor/` | Monitor context cache usage | 1h |

---

## Priority 9: LOW — Clonedeps Skill

**Source:** `/tmp/oh-my-opencode-slim/src/skills/clonedeps/`
- **What it does:** Dependency cloning for multi-repo projects
- Uses git clone optimization patterns

**Effort:** 1.5 hours

## NEW: oh-my-openagent Findings (2026-08-01)

**Research:** https://github.com/code-yeongyu/oh-my-openagent (43-package monorepo)

### High-Priority Additions:

| Component | Source | Purpose | Effort |
|-----------|--------|---------|--------|
| **Hyperplan skill** | .agents/skills/hyperplan/ | 5-agent adversarial cross-critique planning | 6h |
| **Delegate fallback chain** | packages/delegate-core/ | 7-level model fallback chain | 3h |
| **Team primitives** | packages/team-core/ | Registry, mailbox, tasklist, state store | 4h |

### Hyperplan Adaptation for MiMoCode:
1. Create `skills/hyperplan.md` — dispatch oracle/librarian/explorer as "hostile reviewers"
2. Each reviews plan independently, then we synthesize defensible insights
3. Use compose:debate pattern for cross-critique

### Model Failover Upgrade:
Current: single fallback. New chain from delegate-core:
```
user override → category default → fallback_models → hardcoded chain → system default
```

### Team-Core Integration:
- Mailbox: async subagent messaging
- Tasklist: shared task state
- Worktree: per-agent git isolation

---
## Priority 10: LOW — Additional Packages (Discovered in audit)

| Package | Purpose | Effort |
|---------|---------|--------|
| **shared-skills** | Cross-harness skills bundle (git-master, playwright, frontend, review) | 3h |
| **omo-config-core** | Harness-neutral config schema (zod + loader + migration) | 2h |
| **boulder-state** | Work-tracking state machine (JSON-based) | 1.5h |
| **hashline-core** | Hash-anchored edit primitives (line hashing + validation) | 2h |
| **prompts-core** | Markdown prompt loading + variant routing | 1.5h |
| **lsp-tools-mcp** | LSP tools via stdio MCP | 3h |
| **git-bash-mcp** | Windows Git Bash MCP (skip — platform specific) | — |
| **senpi-task** | Task state machine + runners | 3h |
| **telemetry-core** | PostHog telemetry (env-gated opt-out) | 1h |
| **comment-checker-core** | Comment validation | 1h |

**Most promising adaptations:**
- `shared-skills` — 12 builtin skills we don't have (git-master, playwright, frontend)
- `omo-config-core` — could improve our config management
- `boulder-state` — cross-session work tracking

---

## Improvements (Planned Enhancements)

| Enhancement | Priority | Effort | Description |
|-------------|----------|--------|-------------|
| Unioned prompt loader | MEDIUM | 2h | Centralize agent prompts in `skills/_agents/prompts.json` |
| Structured permissions | HIGH | 2h | Add `permissions: readonly/tools/allow/temperature` to frontmatter |
| Prompt inheritance | MEDIUM | 3h | base + custom + append pattern in skill config |
| Multi-model councillors | MEDIUM | 2h | Councillor seats (alpha/beta/gamma/delta) with different models |
| `/agent <name>` command | LOW | 1h | Slash command to dispatch specific agent |

**Structured permissions format:**
```yaml
---
name: oracle
permissions:
  readonly: true
  allow: [read, grep, glob, codesearch]
  deny: [edit, write, bash, task]
temperature: 0.1
---
```

---

## Implementation Order

1. **Week 1:** Council consensus skill (Priority 1) + agent formalization (Priority 2) ✅
2. **Week 2:** smartfetch tools (Priority 3) + ast-grep tools (Priority 4)
3. **Week 3:** image-hook (Priority 5) + cancel-task tool (Priority 7)
4. **Week 4:** deepwork + worktrees skills (Priority 6+7) + remaining hooks

Then implement Improvements (unioned prompt loader, structured permissions, etc.)

## Files Created

- [x] `ADAPTATION_PLAN.md` — comprehensive adaptation plan
- [x] `docs/agent-orchestration-analysis.md` — deep agent research
- [x] `docs/openagent-exploration.md` — openagent repo survey
- [x] `skills/council.md` — multi-model consensus skill ✅
- [x] `skills/oracle.md` — strategic advisor skill ✅
- [x] `skills/librarian.md` — research specialist skill ✅
- [x] `skills/explorer.md` — codebase navigation skill ✅
- [x] `skills/fixer.md` — implementation specialist skill ✅
- [x] `skills/observer.md` — visual analysis skill ✅
- [x] `skills/designer.md` — UI/UX specialist skill ✅
- [ ] `tools/smartfetch.ts` — intelligent web fetch
- [ ] `tools/ast-grep.ts` — AST code intelligence
- [ ] `hooks/foreground-fallback.ts` — error recovery system
