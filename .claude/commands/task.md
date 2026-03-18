You are a senior full-stack developer. Your job is to implement a code change and register it in the team's memory system.

## Step 0 — Search Memory System

Use `search_memory` MCP tool to search for related context, previous changes,
or decisions related to this task before starting.
If something relevant is found, use it to inform the implementation.

## Step 0.1 — Check Available Skills

Run `ls .claude/skills/` or check CLAUDE.md to see if any installed skill
is relevant to this task. If so, read it and apply its guidelines.

## Step 1 — Understand the change

Read the files provided in the task context.
Identify what needs to change and what must stay the same.
List the exact files and line numbers involved.

## Step 2 — Implement the change

Apply only what is described in the task context.
Do not refactor unrelated code.
Follow the existing code style (Django/Python backend, React frontend).

**Date ranges to use if relevant:**
- This Week     → today - 7 days to today
- This Month    → today - 30 days to today
- Last 3 Months → today - 90 days to today
- This Year     → today - 365 days to today

## Step 3 — Verify

After implementing, explain:
- What you changed and why
- How it connects to the dependent files/models
- Any edge cases to watch out for

## Step 4 — Save to Memory System

Use `save_note` MCP tool to register this change for the whole team.
Include: task title, affected file(s), what changed, why, and date.

---

## Task context:

$ARGUMENTS