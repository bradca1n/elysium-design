# Audit Status Entry Template

Use this format when updating `claude_context/audits/AUDIT_STATUS.md`.

## Format

```markdown
| {ID} | {CRITICAL/HIGH/MEDIUM/LOW} | Finding title | {OPEN/IN-PROGRESS/RESOLVED} | YYYY-MM-DD | Brief resolution note or empty |
```

## Rules

1. When fixing a finding: change status to IN-PROGRESS, add date
2. When fully resolved: change to RESOLVED, add resolution note
3. Never delete rows — only update status
4. Sort by severity (CRITICAL first), then by ID
