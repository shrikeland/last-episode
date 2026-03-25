# /evolve — Review patches and evolve project rules

Analyse all patch files in `plans/patches/` and suggest improvements to project rules.

## What to do

1. Read all files in `plans/patches/` (skip `_template.md`)
2. Read `AGENTS.md` and `ARCHITECTURE.md`

3. For each patch, extract:
   - Recurring patterns (same area, same type of mistake)
   - Missing rules or constraints that would have prevented the issue
   - Outdated constraints that no longer apply

4. Produce a structured report:

```
## Evolve Report — [date]

### Recurring patterns
- ...

### Suggested rule additions (AGENTS.md)
| Rule | Trigger | Based on patch |
|------|---------|---------------|
| ... | ... | ... |

### Suggested constraint additions (ARCHITECTURE.md)
- ...

### Stale rules to consider removing
- ...

### No action needed
- [patch name] — already covered by existing rules
```

5. Ask the user: **"Apply suggested changes? (yes / select / skip)"**
   - yes → apply all suggestions to AGENTS.md and/or ARCHITECTURE.md
   - select → list each change individually and ask per-item
   - skip → save the report to `plans/patches/_evolve-report-[date].md` only

Do NOT auto-apply changes without confirmation.