# Create GitHub Pull Request

You are a senior developer preparing a pull request. Follow these steps precisely.

## Step 1: Analyze Changes

Run the following and analyze the output carefully:

```bash
git diff --staged
git diff
git status
```

If nothing to commit, tell the user and stop.

## Step 2: Group Changes into Logical PRs

Analyze ALL modified/staged files and group them by **concern**:

- Each group must represent a single, coherent unit of work
- If changes are unrelated (e.g., a bug fix in `crm` + a new feature in `erp`), they must be **separate PRs**
- If all changes are related, they go into a single PR

Present the groups to the user before proceeding:

```
I found the following logical groups:

Group 1 — [short description]
  - apps/crm/models/lead.py
  - apps/crm/serializers/lead_serializer.py

Group 2 — [short description]
  - apps/erp/views/invoice.py

Proceed with all groups, or should I adjust?
```

Wait for user confirmation before continuing.

## Step 3: Run Tests

Before creating any branch or commit, run the test suite:

```bash
poetry run python manage.py test
```

If tests fail:
- Show the failing tests clearly
- Ask the user: "Tests are failing. Fix before pushing, or proceed anyway?"
- Do NOT proceed without explicit user approval if tests fail

## Step 4: For Each Group, Create a Branch and PR

Repeat the following for each confirmed group:

### 4a. Generate Branch Name

Use this format: `feature/short-description`, `fix/short-description`, or `chore/short-description`

Rules:
- All lowercase, hyphens only, no spaces
- Max 50 characters
- Infer type: `fix` for bug fixes, `feature` for new functionality, `chore` for refactors/config

### 4b. Create Branch and Commit

```bash
git checkout -b <branch-name>
git add <only the files for this group>
git commit -m "<type>(<scope>): <concise description>"
```

Commit message format: `feat(crm): add email validation to lead model`

### 4c. Generate PR Title and Description with AI

Using the diff for this group, generate:

**Title**: One line, max 72 characters, action-oriented
- Example: `feat(crm): validate email format on lead creation`

**Description** using this template:

```markdown
## Summary
[2-3 sentences explaining what changed and why]

## Changes
- `path/to/file.py` — [what changed and why]
- `path/to/other.py` — [what changed and why]

## Test Coverage
- [ ] Unit tests added/updated
- [ ] Manually tested

## Notes
[Anything reviewers should know: edge cases, migrations needed, env vars added, etc.]
```

### 4d. Push and Open PR

```bash
git push origin <branch-name>
gh pr create \
  --base develop \
  --head <branch-name> \
  --title "<generated title>" \
  --body "<generated description>"
```

## Step 5: Summary

After all PRs are created, show:

```
✅ PRs created:

1. [branch-name] → develop
   Title: ...
   URL: <pr-url>

2. [branch-name] → develop
   Title: ...
   URL: <pr-url>
```

## Rules

- Never force push
- Never commit unrelated files together
- Always base off `develop`
- If `gh` CLI is not installed, show the manual steps with the PR body pre-filled
- If the branch already exists remotely, ask the user before overwriting