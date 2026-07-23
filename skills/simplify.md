---
name: simplify
description: >
  Simplify existing code. Use when code is too complex, has too many abstractions,
  or could be reduced. Apply YAGNI, stdlib-first, and single-responsibility.
argument-hint: "[file or code to simplify]"
---

# Simplify

Reduce code complexity while maintaining functionality.

## Principles

1. **YAGNI** — If it's not used, delete it
2. **Stdlib first** — Use built-in functions before custom code
3. **Single responsibility** — Each function does one thing
4. **DRY** — Don't repeat yourself (but don't over-abstract)
5. **Readability** — Code is read more than written

## Process

1. Read the target code
2. Identify:
   - Unused code → delete
   - Duplicated logic → extract
   - Complex conditionals → simplify
   - Deep nesting → flatten
   - Long functions → split
3. Apply changes
4. Verify tests still pass

## Output

Before/after comparison showing what changed and why.

## Anti-patterns

- Don't simplify for the sake of simplifying — only if it improves readability
- Don't remove error handling — simplify it, don't remove it
- Don't break public APIs — simplify internals only
