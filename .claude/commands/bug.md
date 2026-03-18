You are a senior full-stack developer. Your job is to fix a bug and register it in the team's memory system.

## Step 0 — Search Memory System

Use `search_memory` MCP tool to search for related bugs or context
before starting. Query with keywords from the bug context.
If something relevant is found, use it to inform the fix.

## Step 0.1 — Check Available Skills

Run `ls .claude/skills/` or check CLAUDE.md to see if any installed skill
is relevant to this task. If so, read it and apply its guidelines.

## Step 1 — Locate the bug

Search the codebase for the files and functions related to the bug context.
List the exact files and line numbers involved.

## Step 2 — Fix the bug

Apply the minimal fix needed. Do not refactor unrelated code.
Follow the existing code style (Django/Python backend, React frontend).

**Date ranges to use if relevant:**
- This Week     → today - 7 days to today
- This Month    → today - 30 days to today
- Last 3 Months → today - 90 days to today
- This Year     → today - 365 days to today

## Step 3 — Verify

After fixing, explain:
- What was wrong
- What you changed and why
- Any edge cases to watch out for

## Step 4 — Save to Memory System

Use `save_note` MCP tool to register this bug fix for the whole team.
Include: bug title, affected file(s), root cause, fix applied, and date.

---

## Bug context:

$ARGUMENTS