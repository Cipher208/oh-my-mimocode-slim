---
name: reflect
description: >
  Review recent sessions, find patterns, and suggest improvements.
  Use after completing a task or when asked to reflect.
argument-hint: ""
---

# Reflect

Review recent work and extract reusable patterns.

## Process

1. Review recent session history (last 5-10 tool calls)
2. Identify patterns:
   - What worked well?
   - What was repeated?
   - What could be automated?
   - What caused errors?
3. Suggest improvements:
   - New skills or rules
   - Automation opportunities
   - Anti-patterns to avoid

## Output Format

```
## Reflection

### What Worked
- [pattern 1]
- [pattern 2]

### What Could Improve
- [improvement 1]
- [improvement 2]

### Suggested Actions
1. [action 1]
2. [action 2]
```

## When to Use

- After completing a complex task
- When you notice repeated manual steps
- When errors keep occurring
- When the user asks to reflect

## Anti-patterns

- Don't reflect without acting — every reflection should produce at least one actionable improvement
- Don't focus on what went wrong — focus on what to do differently
