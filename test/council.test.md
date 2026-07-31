# Council Skill — Test Suite

## Unit Tests (logic validation)

### Test 1: Consensus detection
- [ ] Input: 3 identical responses → output should contain "Consensus Level: unanimous"
- [ ] Input: 2 agree, 1 disagrees → "Consensus Level: majority"  
- [ ] Input: 2 vs 2 split → "Consensus Level: split"

### Test 2: Councillor crediting
- [ ] Output must name each councillor: "Per-Councillor Details" section
- [ ] Must reference seat names (alpha/beta/gamma/delta)
- [ ] Must state unique contribution from each

### Test 3: Synthesis quality
- [ ] "Council Response" section present
- [ ] "Council Summary" with all 4 sub-sections present
- [ ] Disagreements section explains resolution reasoning
- [ ] Recommended action is specific (not generic)

## E2E Tests (full workflow)

### Test 4: Basic council dispatch
**Trigger:** `/council "Simple binary question with clear answer"`
**Expected:**
1. 4 delegate_task calls made (parallel)
2. All complete within timeout
3. 200-word synthesis
4. Consensus level "unanimous" (for simple factual questions)

### Test 5: Council with disagreement
**Trigger:** `/council "Should we rewrite our core in Rust?"`
**Expected:**
1. Some councillors answer yes, some no
2. "Consensus Level: split"
3. Resolution explains tradeoff
4. Final recommendation includes caveat

### Test 6: Council with unavailable models
**Trigger:** Same question, one model API unavailable
**Expected:**
1. Skip unavailable model
2. Continue with 3 councillors
3. Note in summary that delta was unavailable

### Test 7: Council prompt parsing
**Trigger:** `/council use 3 councillors: "Test question"`
**Expected:**
1. Exactly 3 delegate_task calls (not 4)
2. Correct model assignment

## Manual Verification Steps

1. **Skill loads:** `skills/council.md` readable by MiMoCode
2. **Slash command:** `/council` triggers skill
3. **Debug log:** `/tmp/council-skill.log` captures dispatch info (if implemented)

## Test Commands

```bash
# Validate skill format
rg 'name:.*council' ~/.local/share/mimocode/skills-native/council.md
rg '# Council' ~/.local/share/mimocode/skills-native/council.md | head -1

# Check required sections exist
rg '## Council Response' ~/.local/share/mimocode/skills-native/council.md
rg '## Council Summary' ~/.local/share/mimocode/skills-native/council.md

# Verify procedure present
rg '### Step 1' ~/.local/share/mimocode/skills-native/council.md | head -1
```
