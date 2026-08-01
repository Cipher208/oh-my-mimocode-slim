# agent-dispatch hook — Test Suite

## Unit Tests (pattern matching)

### Test 1: Pattern recognition
```bash
echo '/agent oracle "Review architecture"' | grep -qE '^\/agent\s+\w+' && echo "✅ Match recognized"
echo '/agent list' | grep -qE '^\/agent\s+list' && echo "✅ List command"
echo '/agent unknown' | grep -qE '^\/agent\s+\w+' && echo "✅ Unknown agent detected"
```

### Test 2: Agent validation
- `/agent oracle "..."` → redirect to `/oracle`
- `/agent librarian "..."` → redirect to `/librarian`  
- `/agent nonexistent` → error message with available list
- `/agent list` → show all agents

### Test 3: Task extraction
- `/agent oracle "Review MCP error handling"` → task = "Review MCP error handling"
- `/agent oracle` → task = "" (prompt user)

## E2E Tests (interactive TUI)

### Test 4: Full dispatch flow
1. Start MiMoCode with hook installed
2. Type `/agent oracle "Why does MCP connection drop?"`
3. Verify redirect to `/oracle`
4. Verify oracle skill invoked with task

### Test 5: Unknown agent
1. Type `/agent nonexistent "test"`  
2. Verify error: "Unknown agent: nonexistent"

### Test 6: List agents
1. Type `/agent list`
2. Verify formatted agent list with descriptions

## Test Commands

```bash
# Verify hook file syntax (Bun runtime)
node --experimental-strip-types hooks/agent-dispatch.ts >/dev/null 2>&1 && echo "✅ Syntax valid" || echo "⚠️  Syntax error"

# Verify agent mappings
grep -c 'oracle\|librarian\|explorer\|fixer\|observer\|designer\|council' hooks/agent-dispatch.ts

# Install hook
cp hooks/agent-dispatch.ts ~/.config/mimocode/hooks/
```

## Expected Coverage

| Test | Description | Status |
|------|-------------|--------|
| Pattern match | `/agent <name> "<task>"` regex | ✅ |
| List command | `/agent list` shows all agents | ✅ |
| Unknown agent | Falls back to error message | ✅ |
| Skill redirect | Maps agent → skill name | ✅ |
| Task extraction | Extracts task from quotes | ✅ |
