---
name: today-in-claude-code
description: Generate a summary of today's Claude Code activity including token usage and tasks accomplished.
---

# Today in Claude Code

Generate a comprehensive daily summary of Claude Code usage.

## Process

### 1. Get Token Usage
Run `npx ccusage --today` to get authoritative token counts and cost.

### 2. Get Full Prompt History
Extract all user prompts from today grouped by project:

```bash
# Calculate today's timestamp range (ms)
start_ts=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) 00:00:00" +%s)000
end_ts=$((start_ts + 86400000))

# Get all prompts grouped by project
jq -r --argjson start "$start_ts" --argjson end "$end_ts" '
  select(.timestamp >= $start and .timestamp < $end and .display != null and .display != "") |
  (.project | split("/") | .[-1]) + ": " + (.display | gsub("\n"; " ") | .[0:150])
' ~/.claude/history.jsonl
```

### 3. Analyse and Group by Theme

Read through ALL the prompts and group them into meaningful work themes. Do not just list session summaries. Actually read what was asked and done.

**Focus on substantial work (10-15+ minutes of effort).** Minor tasks, quick fixes, and small tweaks should be summarised briefly under "Other" rather than given their own bullet points.

For each major theme, identify:
- What was the substantial work done
- Key decisions made
- Artefacts produced (posts, skills, documents, etc.)

### 4. Output Format

Generate markdown suitable for a daily note:

```markdown
## Claude Code Activity

### Token Usage
- **Output tokens:** X
- **Input tokens:** X
- **Cache read:** XM
- **Cost:** $X.XX

### Day Summary
2-3 sentences giving the overall shape of the day: what were the major focus areas, how did the day flow (morning/afternoon/evening), what was accomplished at a high level.

### [Theme 1 - e.g. "Feature Development (morning)"]
- Substantial task completed (not minor tweaks)
- Key decision or artefact
- 2-4 bullets max per theme

### [Theme 2 - e.g. "Blog Post and Webinar Write-up (afternoon)"]
- Major work done
- Artefacts created

### Other
- Brief summary of smaller tasks grouped together
- Quick fixes, minor tweaks, small config changes
- Keep this section concise
```

## Key Rules

1. **Summarise, don't itemise**: Only track work that took 10-15+ minutes. Everything else goes in "Other" as a brief mention.
2. **Day Summary is essential**: Always include 2-3 sentences capturing the overall shape of the day before diving into themes.
3. **2-4 bullets per theme**: Keep each theme focused on the substantial work, not every small step.
4. **Group by theme not project**: A project might span multiple themes or vice versa.
5. **Time of day hints**: Use prompt timestamps to indicate morning/afternoon/evening work.
6. **"Other" catches the rest**: Quick tasks, minor fixes, small config changes all get summarised briefly here.
7. **Output location**: elysium-design/daily-summary
8. **Output file naming**: e.g. Daily Summary {dd-mm-yyyy}

## Example Output

See the format used in daily notes. The goal is to give a high-level view of what was accomplished, not an exhaustive list of every action taken.

