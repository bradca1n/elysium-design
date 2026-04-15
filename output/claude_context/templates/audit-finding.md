# Audit Finding Template

Use this format when documenting new audit findings in `claude_context/audits/`.

## Format

```markdown
### {ID}: {Finding Title}

**Severity:** CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
**Category:** [Access Control | Reentrancy | Logic Error | Gas Optimization | ...]
**Location:** `src/facets/FacetName.sol` lines N-M (or `packages/app/src/file.ts` lines X-Y)

**Description:**
[What the vulnerability/issue is, in 2-3 sentences]

**Impact:**
[What could go wrong if this is exploited/not fixed]

**Recommendation:**
[Specific steps to fix]

**Status:** OPEN | IN-PROGRESS | RESOLVED
**Resolution:** [How it was fixed, if resolved]
```
