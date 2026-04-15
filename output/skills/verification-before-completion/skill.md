---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | "Looks done" |
| Figma design implemented | Screenshot comparison: layout/type/color match | "Looks close" |
| Component matches design | implement-design Step 7 checklist completed | Build passes |
| Gluestack components used correctly | MCP docs fetched + component names in code | "I used VStack" |
| Canvas design complete | .pdf/.png file exists, second refinement pass done | First pass output |
| Frontend design production-grade | No generic fonts, cohesive aesthetic, animations work | Code runs |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- Claiming Figma parity without having run `get_screenshot` and compared it
- Claiming Gluestack components used without having run `get_selected_components_docs`
- Skipping the second refinement pass on canvas work
- Using placeholder fonts, colors, or layout in "final" frontend output
- Trusting that it "looks right" without side-by-side comparison against Figma screenshot
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Looks close enough" | Visual ≠ verified |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Looks done"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

**Figma implementation:**
```
✅ get_screenshot → compare side-by-side → confirm layout/type/color/spacing match
❌ "Looks close" / "Matches the design"
```

**Gluestack components:**
```
✅ get_all_components_metadata → get_selected_components_docs → components in code
❌ "I used Gluestack components"
```

**Canvas design:**
```
✅ File exists (.pdf/.png) → second refinement pass completed → composition cohesive
❌ First pass output claimed as final
```

**Frontend design:**
```
✅ Brand fonts chosen, cohesive aesthetic, no generic AI patterns, animations verified
❌ "It looks good" / "Styled correctly"
```

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
