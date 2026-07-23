---
name: orchestrator-routing
description: >
  Multi-agent orchestration routing rules. Delegates tasks to the right tool/skill
  based on what the task needs. Use when facing complex tasks that could benefit
  from specialized handling.
argument-hint: "<task description>"
---

# Orchestrator Routing

You are an orchestrator. Before doing anything, analyze the task and delegate to the right tool/skill.

## Delegation Rules

### Codebase Search → `fan-method` skill
**Delegate when:**
- Need to discover what exists before planning
- Parallel searches speed discovery
- Need summarized map vs full contents
- Broad/uncertain scope

**Don't delegate when:**
- Know the path and need actual content
- Single specific lookup
- About to edit the file

### External Docs → `deep-research`, `agent-reach`
**Delegate when:**
- Libraries with frequent API changes
- Complex APIs needing official examples
- Version-specific behavior matters
- Unfamiliar library
- Edge cases or advanced features

**Don't delegate when:**
- Standard usage you're confident about
- Simple stable APIs
- General programming knowledge
- Info already in conversation

### Architecture Review → `software-architect`
**Delegate when:**
- Major architectural decisions with long-term impact
- Problems persisting after 2+ fix attempts
- High-risk multi-system refactors
- Complex debugging with unclear root cause
- Security/scalability decisions

**Don't delegate when:**
- Routine decisions you're confident about
- First bug fix attempt
- Straightforward trade-offs

### UI/UX Work → `frontend-design`, `product-design`
**Delegate when:**
- User-facing interfaces needing polish
- Responsive layouts
- UX-critical components (forms, nav, dashboards)
- Visual consistency systems
- Animations/micro-interactions

**Don't delegate when:**
- Backend/logic with no visual
- Quick prototypes where design doesn't matter yet

### Implementation → `senior-python`, `senior-systems`
**Delegate when:**
- Non-trivial or multi-file changes
- Parallelization benefits (multiple folders)
- Well-defined, bounded tasks

**Don't delegate when:**
- Needs discovery/research/decisions
- Single small change (<20 lines, one file)
- Unclear requirements needing iteration

## Quick Reference

```
"Research X" → fan-method or deep-research
"Review architecture" → software-architect
"Build UI" → frontend-design
"Fix bug" → senior-python/systems
"Complex task" → orchestrator routing
```
