---
name: loop-engineering
description: >
  Execute-verify loop with configurable success criteria. Use for iterative
  tasks that need verification after each attempt.
argument-hint: "<goal> [max_attempts]"
---

# Loop Engineering

Execute-verify loops with structured success criteria.

## Pattern

```
1. Execute: Run the task
2. Verify: Check success criteria
3. If pass: Done
4. If fail: Analyze failure, fix, go to 1
5. If max attempts reached: Escalate
```

## Success Criteria Types

| Type | Example | How to verify |
|------|---------|---------------|
| `tests` | `npm test` | Run command, check exit code |
| `build` | `npm run build` | Run command, check exit code |
| `lint` | `ruff check .` | Run command, check exit code |
| `fileExists` | `dist/index.js` | Check file exists |
| `command` | `curl -s localhost:3000` | Run command, check output |
| `manual` | — | Ask user |

## Usage

When facing an iterative task:

1. Define the goal clearly
2. Choose success criteria
3. Set max attempts (default: 5)
4. Execute the task
5. Verify against criteria
6. If failed, analyze what went wrong and try again
7. If max attempts reached, report what was tried

## Example

Goal: "Fix the failing test in auth.test.ts"
Criteria: `tests` (run `pytest tests/auth/test_auth.py -v`)
Max attempts: 3

1. Run tests → fail
2. Analyze error → missing import
3. Fix import → run tests → pass ✓

## Anti-patterns

- Don't skip verification
- Don't change criteria mid-loop
- Don't ignore partial failures
- Don't loop forever — always have max attempts
