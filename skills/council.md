---
name: council
description: "Multi-model consensus skill — dispatches 3-4 models in parallel to answer a question, then synthesizes their responses into a structured Council Report with consensus level, agreed/disputed points, and final recommendation."
permissions:
  readonly: true
  allow: []
  deny: ["*"]
  temperature: 0.2
metadata:
  short-description: Multi-model consensus via parallel subagent dispatch
  category: decision-making
  tags: [consensus, multi-model, debate, synthesis, orchestration]
---

# Council — Multi-Model Consensus

## Purpose

When a question has significant consequences (architecture, security, strategy), dispatch 3-4 different models simultaneously and synthesize their responses into a structured Council Report. This catches blind spots that single-model reasoning misses — the same question to 4 different model "minds" reveals agreement, disagreement, and uncertainty.

## When to Use

- **Architecture decisions** — "should we use PostgreSQL or MongoDB here?"
- **Security assessments** — "is this auth flow safe?"
- **Strategy choices** — "which library to pick?"
- **Code review** — "what are the risks in this PR?"
- **Debugging complex issues** — "what's causing this production bug?"

When the decision is small or routine, **don't use Council** — just answer directly.

## Quick Start

```
/council "Should we adopt context-mode MCP for MiMoCode hooks?"
```

This dispatches 4 councillors (alpha, beta, gamma, delta) with different models, collects answers, and produces:

## Council Response
[Your synthesized answer]

## Per-Councillor Details
- **alpha:** [key points]
- **beta:** [key points]  
- **gamma:** [key points]
- **delta:** [key points]

## Council Summary
- **Consensus Level:** unanimous | majority | split
- **Agreed Points:** [...]
- **Disagreements + Resolution:** [...]
- **Remaining Uncertainty:** [...]
- **Recommended Action:** [...]

## Procedure

### Step 1: Dispatch Councillors (parallel)

Use `delegate_task` with `tasks: [...]` to dispatch 4 councillors simultaneously. Each gets:
- Same prompt (the original question)
- Different model (via model override)
- Read-only tools only (no edit/write/bash)

**Model assignment:**
- **alpha:** `deepseek/deepseek-v4-flash` (your default)
- **beta:** `google/gemini-3.5-flash-lite` (if available)  
- **gamma:** `moonshotai/kimi-k3` (if available)
- **delta:** fallback model or repeat alpha with different temperature

**Prompt template per councillor:**
```
You are councillor {seat} answering a question for the Council consensus.
Give your honest, direct assessment. Don't hedge. State what's right/wrong
and what you'd do in this situation. Keep under 150 words unless details needed.

Question: {original_question}

Answer as councillor {seat}:
```

### Step 2: Wait for all responses

Wait for all delegates to complete. Each councillor produces a text response.

### Step 3: Synthesize

Combine councillor responses into the required output format:
1. Read original question
2. Identify each councillor's unique insight  
3. Find agreements and contradictions
4. Resolve contradictions with explicit reasoning
5. Choose best approach and improve upon it
6. State consensus level

### Step 4: Produce Council Report

Format exactly as specified above. Do NOT collapse into a single summary — keep per-councillor details distinct.

## Configuration

Council can be configured via the question prompt:

```
# Use 3 councillors instead of 4:
/council use 3 councillors: "Should we adopt context-mode MCP?"

# Force specific model for delta:
/council with delta=openai/o1-preview: "Review this architecture"

# Topic-specific focus:
/council focus on performance: "Compare PostgreSQL vs MongoDB for this use case"
```

## Limitations

- Requires `delegate_task` tool (subagent dispatch)
- Councillors have read-only access — cannot make changes
- Model availability varies — skip unavailable models
- Max ~4 councillors (diminishing returns beyond that)
- Responses take ~3x longer than single agent (parallel dispatch)
- **No automatic follow-up** — if split consensus, user must ask explicitly

## Enhancements (TO-DO)

- [ ] **Quality scoring** — rank councillor responses by specificity/examples
- [ ] **Automatic follow-up** — if split consensus on high-stakes question, propose re-dispatch
- [ ] **Timeout exclusion** — councillors who don't respond in ~60s excluded with note
- [ ] **Bias tracking** — flag councillors who consistently disagree without justification

## Integration with Other Skills

| Skill | How it connects |
|-------|----------------|
| **orchestrator-routing** | Use Council for complex decision points |
| **hyperplan** | Each hyperplan agent is a councillor |
| **reflect** | Run Council at session end for final decision synthesis |
| **verification-planning** | Use Council to validate plan before execution |

## Examples

<example>
**Question:** "Refactor the plugin system to use event hooks?"

**alpha (deepseek):** "Yes — current throw→continue bug proves the system is fragile. Event hooks provide loose coupling."

**beta (gemini):** "No — adds complexity. The current approach works after fix. YAGNI."

**gamma (kimi):** "Conditional yes — only if we add test coverage first. Current bug had 0 unit tests."

**delta (fallback):** "Focus on documentation first. Architecture change without docs causes more bugs."

**Council Response:** Conditional yes — implement event hooks WITH test coverage.

**Consensus:** split → resolved toward conditional yes
</example>

<example>
**Question:** "Use context-mode MCP or build custom indexing?"

**All 4 councillors agree:** "Use context-mode MCP — it handles FTS5, content hashing, stale detection."

**Consensus Level:** unanimous
**Recommended Action:** Integrate foreground-fallback hook to catch context-mode startup failures
</example>
