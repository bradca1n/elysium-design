# Error Entry Template

Use this format when appending to `claude_context/errors/*.md` files.

## Format

```markdown
## E-{ROLE}{NN}: Short Error Title
- **Pattern:** What the mistake looks like when it happens
- **Fix:** Exact steps to avoid or correct it
- **Example:** (if helpful)
  ```
  WRONG: [bad code/approach]
  RIGHT: [correct code/approach]
  ```
- **Discovered:** YYYY-MM-DD
```

## Role Prefixes

| Prefix | File | Domain |
|--------|------|--------|
| `G` | errors/GENERAL.md | Cross-cutting mistakes |
| `BC` | errors/blockchain.md | Smart contract pitfalls |
| `FE` | errors/frontend.md | UI/component pitfalls |
| `BE` | errors/backend.md | API/service pitfalls |

Number sequentially within each file (E-G01, E-G02, ... E-FE01, E-FE02, ...).
