# oh-my-opencode-slim → oh-my-mimocode-slim Adaptation Plan

## Summary of Findings

Research of https://github.com/alvinunreal/oh-my-opencode-slim revealed 9 high-value component categories for adaptation to MiMoCode.

## Priority 1: HIGH — foreground-fallback (Error Recovery System)

**Source:** `/tmp/oh-my-opencode-slim/src/hooks/foreground-fallback/`
- `index.ts` — 26.9K lines, 49.9K lines tests
- **What it does:** Detects LLM errors (rate limit, auth, timeout, quota), suggests fallback models, handles retry logic
- **Novel patterns:**
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

## Priority 2: HIGH — smartfetch Tools (Intelligent Web Fetch)

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

## Priority 3: HIGH — ast-grep Tools (AST Code Intelligence)

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
| **auto-update-checker** | `auto-update-checker/` | Check for hook updates | 1h |
| **filter-available-skills** | `filter-available-skills/` | Hide unavailable skills | 1h |

---

## Priority 9: LOW — Clonedeps Skill

**Source:** `/tmp/oh-my-opencode-slim/src/skills/clonedeps/`
- **What it does:** Dependency cloning for multi-repo projects
- Uses git clone optimization patterns

**Effort:** 1.5 hours

## Implementation Order

1. **Week 1:** foreground-fallback (Priority 1)
2. **Week 2:** smartfetch tools (Priority 2) + image-hook (Priority 4)
3. **Week 3:** ast-grep tools (Priority 3) + cancel-task (Priority 7)
4. **Week 4:** deepwork + worktrees skills (Priority 5+6) + remaining hooks (Priority 8)

## Files Created

- [x] `/home/murat/Projects/repos/oh-my-mimocode-slim/ADAPTATION_PLAN.md` — this plan
- [ ] `hooks/foreground-fallback.ts` — error recovery system
- [ ] `tools/smartfetch.ts` — intelligent web fetch
- [ ] `tools/ast-grep.ts` — AST code intelligence
- [ ] `hooks/image-hook.ts` — image processing
- [ ] `skills/deepwork.md` — focus mode skill
- [ ] `skills/worktrees.md` — git worktree management
