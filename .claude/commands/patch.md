# /patch — Document a lesson learned

Create a patch file in `plans/patches/` to capture a non-obvious bug, constraint, or decision.

## When to use
- Fixed a bug that wasn't obvious (took >15 min, needed investigation)
- Hit a library/framework constraint or incompatibility
- Made an architectural decision under pressure that others should know about
- Found a pattern that breaks silently (TypeScript types, SSR boundaries, etc.)

## What to do

1. Ask the user: **"What happened? Briefly describe the problem and what you found."**
   If `$ARGUMENTS` is provided, use it as the initial description — skip asking.

2. Based on their answer, create `plans/patches/<kebab-case-name>.md` using this structure:

```markdown
# Patch: [short name]

**Date**: [today's date]
**Area**: auth | db | ui | api | build | types | other

## Problem
What went wrong. The symptom — what was observed.

## Root Cause
Why this happened. Not "what broke" but "why it wasn't obvious".

## Solution
What was changed to fix it.

## Prevention
What to remember / check in the future to avoid repeating this.
Any constraints that follow from this.
```

3. After creating the file, check if `ARCHITECTURE.md` or `AGENTS.md` should be updated
   (e.g., a new hard rule, a new constraint, a version lock to document).
   If yes — update the relevant section.

4. Confirm to the user: patch saved at `plans/patches/<name>.md`.