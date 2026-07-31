# Agent Orchestration System — Deep Analysis

## Source
`alvinunreal/oh-my-opencode-slim/src/agents/` (530+ files, ~500K lines total)

## Agent Definitions

| Agent | Purpose | Permission Model | Temperature |
|-------|---------|------------------|-------------|
| **explorer** | Codebase navigation | read-only | 0.1 |
| **librarian** | Research, docs lookup | read-only | 0.3 |
| **oracle** | Architecture, code review | read-only | 0.1 |
| **designer** | UI/UX specialist | writable | 0.5 |
| **fixer** | Implementation specialist | writable | 0.1 |
| **observer** | Visual analysis | read-only | 0.5 |
| **council** | Synthesizer (no tools) | none | 0.2 |
| **councillor** | Specialized advisors | read-only | per-agent |

## Key Architectural Patterns

### 1. Permission Model Pattern
```typescript
// Deny-all + explicit allow — zero trust
function createReadOnlyAgentPermission(): AgentPermission {
  return {
    '*': 'deny',
    read: 'allow', glob: 'allow', grep: 'allow',
    // explicitly deny dangerous ones
    bash: 'deny', edit: 'deny', write: 'deny', task: 'deny'
  }
}
```

**MiMoCode adaptation:** Each role-specialized agent gets locked-down tool config.

### 2. Council/Councillor Consensus Pattern

**Multi-model voting:**
- Orchestrator dispatches multiple councillors (different models)
- Each councillor has read-only access to codebase
- Council agent (no tools) receives all responses
- Synthesizes: agreements → contradictions → resolution → final answer
- Output format:
  ```
  ## Council Response
  ## Per-Councillor Details (alpha, beta, gamma, delta)
  ## Council Summary (Consensus Level, Agreed Points, Disagreements, Recommended Action)
  ```

**Novel aspect:** Consensus resolution isn't averaging — it's choosing best approach + improving upon it.

### 3. Orchestrator Dispatch Pattern

From `orchestrator.ts` (21.5K lines):
```typescript
// Agent dispatch with priority-ordered model fallback
const _modelArray = [
  { id: "openai/gpt-4.1", variant: "high" },
  { id: "anthropic/claude-3.5-sonnet-20241022", variant: "fallback" }
]

// Dispatch via task() — creates subagent sessions
const subagentResult = await dispatchAgent(agentName, prompt, model)
```

### 4. Prompt Inheritance Pattern

```typescript
// Base prompt + optional custom + append
function resolvePrompt(base, customPrompt?, customAppendPrompt?) {
  const effectiveBase = customPrompt !== undefined ? customPrompt : base;
  return customAppendPrompt !== undefined
    ? `${effectiveBase}\n\n${customAppendPrompt}`
    : effectiveBase;
}
```

## Adaptation Opportunities for MiMoCode

### HIGH Priority Adaptations:

1. **Council consensus skill** — multi-model voting on architecture decisions
   - Current: `/consult` runs tools sequentially
   - Better: dispatch 3-4 models in parallel, council agent synthesizes
   
2. **Specialist agent skill set** — formal role definitions:
   - `skills/oracle.md` — strategic advisor (already exists, formalize)
   - `skills/librarian.md` — research specialist (formalize)
   - `skills/explorer.md` — navigation (formalize)
   - `skills/fixer.md` — implementation (formalize)

3. **Permission templates** — lock down read-only vs writable agents:
   - Read-only agents: explorer, oracle, librarian, observer
   - Writable agents: designer, fixer
   - No-tool agents: council, orchestrator

### MEDIUM Priority:

4. **Orchestrator dispatch** — unified `/agent <role>` command that dispatches specialist
   - Currently distributed across skills
   - Could consolidate: `/agent oracle "review this architecture"`

5. **Councillor seat pattern** — 4 models simultaneously for critical decisions
   - `/council "review architecture tradeoffs"` dispatches alpha/beta/gamma/delta
   - Each uses different model (deepseek, gemini, kimi, etc.)

## Missing from oh-my-mimocode-slim:

| Component | slim has | mimocode-slim has | Gap |
|-----------|----------|-------------------|-----|
| Council consensus | ✅ 26.9K lines | ❌ | **HIGH** |
| Multi-model dispatch | ✅ orchestrator.ts | ❌ | **HIGH** |
| Permission templates | ✅ permissions.ts | ❌ | **MEDIUM** |
| Councillor seats | ✅ seat names | ❌ | **HIGH** |
| Agent factory pattern | ✅ createXAgent | ❌ | MEDIUM |

## Effort Estimate

| Task | Hours |
|------|-------|
| Council consensus skill | 3h |
| Specialist agent permission templates | 2h |
| Councillor seat dispatch | 2h |
| Orchestrator `/agent` command | 2h |
| **Total** | **9-10h** |

## Next Steps

1. Implement council skill using `delegate_task` parallelization
2. Create permission-locked agent variants
3. Add `/council` slash command for multi-model consensus
4. Formalize oracle/librarian/explorer/designer/fixer as documented skill templates
