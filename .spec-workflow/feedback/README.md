# Async Feedback System

This directory provides an **async feedback loop** between human and AI agent.

## How It Works

```
┌─────────────┐
│   Human     │
│  (You)      │
└──────┬──────┘
       │
       │ 1. Post feedback
       ▼
┌─────────────────┐
│ pending.md      │  ← Human writes feedback here
└────────┬────────┘
         │
         │ 2. AI reads on each iteration
         ▼
┌─────────────────┐
│  AI Agent       │  ← Considers feedback in next iteration
└────────┬────────┘
         │
         │ 3. Processes feedback
         ▼
┌─────────────────┐
│ archive/        │  ← Processed feedback moved here
│ YYYY-MM-DD.md   │
└─────────────────┘
```

## Usage

### For Humans (You)

**Post feedback:**
```bash
# Easy way - use the feedback script
./scripts/post-feedback.sh "Web UI doesn't show todo list from database"

# Or manually edit
vim .spec-workflow/feedback/pending.md
```

**Feedback template:**
```markdown
## [Title of Issue/Request]
**Date:** YYYY-MM-DD
**Priority:** LOW | MEDIUM | HIGH | CRITICAL
**Type:** BUG | FEATURE | IMPROVEMENT | QUESTION

**Description:**
What you observed or want to request

**Expected Behavior:**
What should happen

**Steps to Reproduce (if bug):**
1. Step one
2. Step two

**Additional Context:**
Any other info, screenshots, etc.
```

### For AI Agent

**On each iteration:**
1. Check if `pending.md` exists
2. If yes, read feedback and add to prompt context
3. Consider feedback when determining what to implement
4. After addressing, move feedback to `archive/YYYY-MM-DD.md`
5. Reference feedback in commit message

**Don't block on feedback:**
- Feedback is advisory, not blocking
- AI continues normal work if no feedback
- Multiple feedback items can accumulate
- Process feedback when relevant to current work

## Example Workflow

**Human posts feedback:**
```bash
./scripts/post-feedback.sh "Missing: Web UI doesn't display todos from database, only shows hardcoded samples. Need to connect web UI to SQLite data."
```

**AI agent on next iteration:**
```
Iteration 42:
- Checks for pending.md ✓
- Reads feedback about web UI data connection
- Adds to context: "Human feedback: Need to connect web UI to database"
- Decides to implement: API endpoint for loading todos
- Implements feature
- Archives feedback to archive/2025-12-14.md
- Commits with: "feat(web): connect UI to SQLite database [feedback]"
```

**Human verifies:**
```bash
# Open web UI, see actual todos!
# Happy with fix, continues autonomous dev
```

## Benefits

✅ **Non-blocking:** AI doesn't wait for human approval
✅ **Async:** Post feedback anytime, AI picks it up next iteration
✅ **Contextual:** AI has full context when addressing feedback
✅ **Trackable:** Archived feedback shows what was addressed
✅ **Low friction:** Quick to post, doesn't interrupt AI flow

## Directory Structure

```
.spec-workflow/feedback/
├── README.md           # This file
├── pending.md          # Active feedback (AI reads this)
├── archive/
│   ├── 2025-12-14.md   # Processed feedback
│   ├── 2025-12-15.md
│   └── ...
└── template.md         # Template for posting feedback
```

## Tips

**When to post feedback:**
- Visual features that need human verification
- Bugs you notice when testing
- Feature requests based on usage
- Architecture concerns
- Performance issues

**What NOT to post:**
- Urgent critical bugs (stop the agent manually instead)
- Fundamental architecture changes (update steering docs)
- Questions for immediate answer (ask directly)

**Keep feedback:**
- Specific and actionable
- One issue per feedback item
- Include verification steps
- Prioritized (helps AI decide what to tackle first)
