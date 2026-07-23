---
name: verification-planning
description: >
  Plan verification before implementing. Use before starting any implementation
  to define how success will be measured.
argument-hint: "<what to implement>"
---

# Verification Planning

Define how to verify changes before implementing.

## Process

1. Understand what needs to change
2. Define success criteria:
   - What tests should pass?
   - What behavior should change?
   - What should NOT change?
3. Plan verification steps:
   - Which tests to run?
   - What manual checks needed?
   - What rollback plan if verification fails?
4. Implement with verification in mind

## Output

```
## Verification Plan

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Verification Steps
1. Run: [command]
2. Check: [expected output]
3. Verify: [manual check]

### Rollback
If verification fails: [rollback steps]
```

## When to Use

- Before implementing any feature
- Before fixing a bug (define what "fixed" means)
- Before refactoring (define what "simplified" means)
- When the user asks to verify something

## Anti-patterns

- Don't implement without defining success first
- Don't skip verification — it's part of the task, not optional
- Don't assume tests cover everything — verify edge cases too
