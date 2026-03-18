# AGENTS - gym-trainer-client

## Task Classification — do this first

Classify before loading any context.

**SIMPLE — act directly, no MCP:**
- Add/modify a prop, field, or label in an existing component
- Fix a typo or static text
- Adjust CSS or layout details
- Change a constant or config value

**FAMILIAR — `search_memory()` only if uncertain:**
- New component mirroring an existing one
- New route following an existing pattern
- Minor state changes in a known store
- Extend a composable with a method similar to existing ones

**COMPLEX — full MCP protocol:**
- Bug with no obvious cause
- New feature touching store + router + backend
- Changes to auth flow or global state architecture
- Feature touching >3 files across different layers

---

## Mandatory Workflow

1. **Classify the task first** (see above).
2. Query memory MCP only for FAMILIAR or COMPLEX tasks that affect business behavior.
3. Use `project="fitness-app"` filters for semantic queries.
4. Check decisions/bug-fixes before changing forms, dashboards, or state logic.

## MCP Call Order (lightest to heaviest)

```
1. rank_context_templates(task, project)   → find relevant context without loading it
2. search_bug_fixes(query, project)        → check for prior solutions
3. search_notes(query, project)            → load relevant chunks by similarity
4. get_note(note_id)                       → load one specific note in full
5. get_context_pack(task, project)         → WARNING: ~15k tokens, use only when
                                             module is unfamiliar or 1–4 insufficient
```

## Suggested Queries

- `rank_context_templates("calendar completion bug", project="gym-trainer")`
- `search_decisions("frontend flow", project="gym-trainer")`
- `search_bug_fixes("ui bug", project="gym-trainer")`
- `get_project_context("gym-trainer")`
- `search_memory(query, type="learning")`

## save_debug_note — required fields

```
title       : short slug (e.g. "store-not-updated-after-upsert")
summary     : one-line description of the bug (required — tool fails without it)
content     : full markdown body
project     : "gym-trainer"
relative_dir: "11-debugging"
```

## save_session_summary — required fields

```
title   : descriptive session title
task    : one-line description of what was worked on (required — tool fails without it)
content : full markdown body
project : "gym-trainer"
```

## Guardrails

- Do not redefine business behavior if notes already specify rules.
- If no relevant memory is found, state that explicitly before proposing changes.


## FINAL TASK 

ALWAYS SAVE THE CHANGES IN THE MCP SERVER