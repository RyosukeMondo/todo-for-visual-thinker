#!/bin/bash
set -e

# Autonomous Development Runner for Todo for Visual Thinker
# This script orchestrates AI-driven development using Codex
#
# Usage:
#   ./scripts/autonomous-dev.sh [OPTIONS]
#
# Options:
#   -h, --help              Show this help message
#   -i, --iterations N      Maximum iterations (default: 50)
#   -c, --checkpoint N      Checkpoint interval (default: 10)
#   -s, --spec NAME         Spec name (default: mvp-foundation)
#   -m, --model MODEL       Codex model (default: gpt-5.1-codex)
#                           Options: gpt-5.1-codex-max, gpt-5.1-codex, gpt-5.1-codex-mini, gpt-5-codex
#   -d, --dry-run           Show what would be done without executing
#
# Environment Variables:
#   MAX_ITERATIONS          Override max iterations
#   CHECKPOINT_INTERVAL     Override checkpoint interval
#   SPEC_NAME               Override spec name
#   CODEX_MODEL             Override Codex model
#
# Examples:
#   ./scripts/autonomous-dev.sh                           # Run with defaults
#   ./scripts/autonomous-dev.sh -i 100 -c 5               # 100 iterations, checkpoint every 5
#   ./scripts/autonomous-dev.sh -m gpt-5.1-codex-mini     # Use faster mini model
#   CODEX_MODEL=gpt-5.1-codex-max ./scripts/autonomous-dev.sh  # Use max via env var

# Parse command line arguments
DRY_RUN=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        -i|--iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        -c|--checkpoint)
            CHECKPOINT_INTERVAL="$2"
            shift 2
            ;;
        -s|--spec)
            SPEC_NAME="$2"
            shift 2
            ;;
        -m|--model)
            CODEX_MODEL="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    head -n 30 "$0" | grep "^#" | sed 's/^# \?//'
    exit 0
fi

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
CHECKPOINT_INTERVAL=${CHECKPOINT_INTERVAL:-10}
SPEC_NAME=${SPEC_NAME:-""}  # Empty means steering-driven mode
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Only set SPEC_DIR and TASKS_FILE if SPEC_NAME is provided
if [ -n "$SPEC_NAME" ]; then
    SPEC_DIR="$PROJECT_ROOT/.spec-workflow/specs/$SPEC_NAME"
    TASKS_FILE="$SPEC_DIR/tasks.md"
else
    SPEC_DIR=""
    TASKS_FILE=""
fi

LOG_FILE="$PROJECT_ROOT/autonomous-dev.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Codex configuration
CODEX_CMD="codex"
CODEX_MODEL="${CODEX_MODEL:-gpt-5.1-codex}"  # gpt-5.1-codex-max, gpt-5.1-codex, gpt-5.1-codex-mini, gpt-5-codex
CODEX_FLAGS="--dangerously-bypass-approvals-and-sandbox"  # Required for automation
CODEX_CONFIG_OVERRIDES=(
    "-c" "max_tokens=4000"
    "-c" "temperature=0.7"
)

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}" | tee -a "$LOG_FILE"
}

# Banner
echo ""
log "╔════════════════════════════════════════════════════════════╗" "$BLUE"
log "║          🤖 Autonomous Development Session                ║" "$BLUE"
log "║          Todo for Visual Thinker                          ║" "$BLUE"
log "╚════════════════════════════════════════════════════════════╝" "$BLUE"
echo ""
log "📊 Configuration:" "$BLUE"
log "  Max iterations: $MAX_ITERATIONS"
log "  Checkpoint interval: $CHECKPOINT_INTERVAL"
if [ -n "$SPEC_NAME" ]; then
    log "  Spec: $SPEC_NAME"
else
    log "  Mode: Steering-driven (no spec)" "$GREEN"
fi
log "  Project root: $PROJECT_ROOT"
log "  Log file: $LOG_FILE"
echo ""

# Validation
if [ ! -f "$PROJECT_ROOT/.spec-workflow/steering/product.md" ]; then
    log "❌ Error: Steering documents not found" "$RED"
    log "Please ensure product.md, design.md, and tech.md exist in .spec-workflow/steering/" "$RED"
    exit 1
fi

# Determine mode based on SPEC_NAME and tasks.md existence
if [ -z "$SPEC_NAME" ]; then
    log "✓ Running in steering-driven mode (no spec name provided)" "$GREEN"
    log "Will work directly from steering documents (product.md, design.md, tech.md)" "$GREEN"
    STEERING_DRIVEN=true
elif [ -n "$TASKS_FILE" ] && [ -f "$TASKS_FILE" ]; then
    log "✓ tasks.md found - running in task-driven mode" "$GREEN"
    STEERING_DRIVEN=false
else
    log "⚠️  tasks.md not found - running in steering-driven mode" "$YELLOW"
    log "Will work directly from steering documents (product.md, design.md, tech.md)" "$YELLOW"
    STEERING_DRIVEN=true
fi

# Check if Codex is available
if ! command -v $CODEX_CMD &> /dev/null; then
    log "❌ Error: Codex command '$CODEX_CMD' not found" "$RED"
    log "Please install Codex CLI or update PATH." "$RED"
    log "Installation: https://github.com/openai/codex" "$RED"
    exit 1
fi

# Prompt template
read -r -d '' PROMPT_TEMPLATE << 'EOF' || true
# Autonomous Development Mode - Iteration {ITERATION}

You are in autonomous development mode for "Todo for Visual Thinker".

## Your Mission
Complete ONE atomic task following strict quality standards, then exit.

**CRITICAL**: You MUST implement actual code and make a git commit. Analysis-only iterations are NOT acceptable. Every iteration must produce tangible code changes.

## Process

### 1. Read Context (Required)
Load these files to understand the project:
- `.spec-workflow/steering/product.md` - Product vision, scope, roadmap
- `.spec-workflow/steering/design.md` - UI/UX system, accessibility guidelines
- `.spec-workflow/steering/tech.md` - Complete technical architecture and standards
{TASKS_MD_LINE}
- `.spec-workflow/visual-checklist.md` - Visual features requiring human verification
{FEEDBACK_SECTION}

### 2. Determine What to Implement

**If tasks.md exists:**
- Look for first task marked `[ ]` (pending) in tasks.md
- If NO pending tasks exist:
  * Compare implemented features vs product.md Phase 1 requirements
  * If ALL Phase 1 complete: Exit code 99 (project done)
  * If gaps exist: Generate new tasks based on steering documents OR exit code 2

**If tasks.md does NOT exist (steering-driven mode):**
- Read product.md to identify Phase 1 requirements
- Compare with current implementation (check existing files in src/)
- Identify ONE atomic feature/component that needs implementation
- **Implementation priority order:**
  1. **Domain entities** (src/core/domain/) - Todo entity, value objects
  2. **Repository interfaces** (src/core/ports/) - ITodoRepository interface
  3. **Use cases** (src/core/usecases/) - CreateTodo, ListTodos, etc.
  4. **Repository implementations** (src/core/adapters/) - SQLiteTodoRepository
  5. **CLI commands** (src/cli/) - Command handlers
  6. **Web UI components** (src/web/) - React components

**What to implement NOW:**
- If src/core/domain/ is empty: Implement Todo entity with all properties
- If Todo entity exists but no repository: Implement repository interface
- If interface exists but no implementation: Implement SQLite adapter
- If core complete but no CLI: Implement first CLI command
- If CLI exists but no web UI: Implement first React component

**CRITICAL RULES:**
- You MUST write actual code files (not just planning)
- You MUST include tests for what you implement
- You MUST run quality gates and fix any failures
- You MUST make a git commit when done
- If Phase 1 complete: Exit code 99
- If you cannot determine what to implement: Exit code 2 (human needed)

**Important:** Work on ONE atomic, deployable piece of functionality at a time.

### 3. Implement Task
Follow tech.md standards strictly:
- Max 500 lines per file (excluding comments/blanks)
- Max 50 lines per function
- Dependency injection for all external dependencies
- Hexagonal architecture (Ports & Adapters)
- SOLID principles, SLAP (Single Level of Abstraction)
- Fail-fast error handling with structured logging

### 4. Write Tests
Achieve these coverage targets:
- Minimum 80% overall coverage
- 90%+ for critical paths
- Unit tests: Isolated with mocked dependencies
- Integration tests: For repository/adapter code

### 5. Quality Gates (ALL Must Pass)
Run these commands in sequence:
```bash
cd {PROJECT_ROOT}
pnpm lint           # ESLint must pass
pnpm typecheck      # TypeScript must compile
pnpm test           # All tests must pass
pnpm test:coverage  # Coverage must be ≥80%
pnpm build          # Build must succeed
```

**Retry Logic:**
- If any gate fails: Fix issue and retry
- Max 3 retry attempts per task
- After 3 failures: Exit code 1 (escalate to human)

### 6. Commit Changes
When all quality gates pass:

```bash
git add .
git commit -m "$(cat <<'COMMIT_MSG'
<type>(<scope>): <description>

<detailed explanation of changes and rationale>

Task: <task-id from tasks.md OR feature from product.md>
Coverage: <percentage>%
Files: <list of key files changed>

🤖 Generated with Codex
COMMIT_MSG
)"
```

Commit types: feat, fix, refactor, test, docs, chore

### 7. Update Task Status (if using tasks.md)
- If tasks.md exists: Mark completed task with `[x]`
- Commit the tasks.md update separately
- If steering-driven mode: Skip this step (task tracking is implicit)

### 8. Exit with Appropriate Code
- **0**: Success - task completed, continue to next
- **1**: Error - quality gates failed 3x or unclear requirement (escalate to human)
- **2**: Checkpoint - request human review
- **99**: Complete - all Phase 1 tasks done, ready for UAT

## Quality Standards Reminder

### Code Metrics (Enforced)
- Lines/file: ≤500 (excluding comments)
- Lines/function: ≤50
- Test coverage: ≥80% (≥90% critical paths)
- Cyclomatic complexity: ≤10

### Architecture (Non-negotiable)
- Hexagonal (Ports & Adapters) pattern
- Dependency injection mandatory
- No hard-coded dependencies
- Clear separation: domain, usecases, ports, adapters

### Error Handling (Required)
- Fail fast: Validate at entry points
- Custom error hierarchy with error codes
- Structured JSON logging
- Never log secrets/PII

## Escalation Triggers
Exit code 1 (request human) when:
- Quality gates fail 3 consecutive times
- Requirement is unclear or ambiguous
- Architectural decision needed (not in tech.md)
- External dependency conflict
- Breaking change required
- Cannot determine how to implement

## Current Status
- **Iteration**: {ITERATION} of {MAX_ITERATIONS}
- **Mode**: {MODE_STATUS}
- **Checkpoint**: Next at iteration {NEXT_CHECKPOINT}

---

**BEGIN IMPLEMENTATION NOW**

Read steering docs → Find next task → Implement → Test → Commit → Exit

Good luck! 🚀
EOF

# Main loop
ITERATION=0
CONSECUTIVE_FAILURES=0
NO_PROGRESS_COUNT=0
MAX_NO_PROGRESS=3  # Circuit breaker: stop after 3 iterations with no commits

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    NEXT_CHECKPOINT=$(( (ITERATION / CHECKPOINT_INTERVAL + 1) * CHECKPOINT_INTERVAL ))

    echo ""
    log "═══════════════════════════════════════════════════════════" "$BLUE"
    log "  Iteration $ITERATION of $MAX_ITERATIONS" "$BLUE"
    log "═══════════════════════════════════════════════════════════" "$BLUE"
    echo ""

    # Check pending tasks count (if using tasks.md)
    if [ "$STEERING_DRIVEN" = false ]; then
        PENDING_COUNT=$(grep -c "^- \[ \]" "$TASKS_FILE" 2>/dev/null || echo "0")
        IN_PROGRESS_COUNT=$(grep -c "^- \[-\]" "$TASKS_FILE" 2>/dev/null || echo "0")
        COMPLETED_COUNT=$(grep -c "^- \[x\]" "$TASKS_FILE" 2>/dev/null || echo "0")

        log "📋 Task Status:" "$BLUE"
        log "  Pending: $PENDING_COUNT"
        log "  In Progress: $IN_PROGRESS_COUNT"
        log "  Completed: $COMPLETED_COUNT"
        echo ""

        if [ "$PENDING_COUNT" -eq 0 ] && [ "$IN_PROGRESS_COUNT" -eq 0 ]; then
            log "🎉 No pending tasks! Checking if project is complete..." "$GREEN"
            EXIT_CODE=99
        fi
    else
        log "📋 Mode: Steering-driven (working from product.md directly)" "$BLUE"
        echo ""
        PENDING_COUNT=0
        IN_PROGRESS_COUNT=0
        COMPLETED_COUNT=0
    fi

    # Continue if there are tasks or in steering-driven mode
    if [ "$STEERING_DRIVEN" = false ] && [ "$PENDING_COUNT" -eq 0 ] && [ "$IN_PROGRESS_COUNT" -eq 0 ]; then
        # Already set EXIT_CODE=99 above
        :
    elif [ "$STEERING_DRIVEN" = true ] || [ "$PENDING_COUNT" -gt 0 ] || [ "$IN_PROGRESS_COUNT" -gt 0 ]; then
        # Prepare prompt with substitutions
        PROMPT="${PROMPT_TEMPLATE//\{ITERATION\}/$ITERATION}"
        PROMPT="${PROMPT//\{MAX_ITERATIONS\}/$MAX_ITERATIONS}"
        PROMPT="${PROMPT//\{SPEC_NAME\}/$SPEC_NAME}"
        PROMPT="${PROMPT//\{PROJECT_ROOT\}/$PROJECT_ROOT}"
        PROMPT="${PROMPT//\{NEXT_CHECKPOINT\}/$NEXT_CHECKPOINT}"

        # Add tasks.md line only if in task-driven mode
        if [ "$STEERING_DRIVEN" = false ] && [ -n "$SPEC_NAME" ]; then
            TASKS_MD_LINE="- \`.spec-workflow/specs/$SPEC_NAME/tasks.md\` - Current task list"
            MODE_STATUS="Task-driven (spec: $SPEC_NAME)"
        else
            TASKS_MD_LINE="- *Working in steering-driven mode - no tasks.md*"
            MODE_STATUS="Steering-driven (working from product.md directly)"
        fi
        PROMPT="${PROMPT//\{TASKS_MD_LINE\}/$TASKS_MD_LINE}"
        PROMPT="${PROMPT//\{MODE_STATUS\}/$MODE_STATUS}"

        # Check for human feedback (async mailbox system)
        FEEDBACK_FILE="$PROJECT_ROOT/.spec-workflow/feedback/pending.md"
        if [ -f "$FEEDBACK_FILE" ]; then
            log "📬 Human feedback detected!" "$YELLOW"
            FEEDBACK_CONTENT=$(cat "$FEEDBACK_FILE")
            FEEDBACK_SECTION="

### ⚠️ IMPORTANT: Human Feedback Available

The human has posted async feedback for you to consider:

\`\`\`
$FEEDBACK_CONTENT
\`\`\`

**Instructions:**
- CONSIDER this feedback when deciding what to implement
- If you address the feedback, mention it in your commit message
- After processing, this feedback will be archived
- Feedback is advisory - you can continue with planned work if more urgent
"
        else
            FEEDBACK_SECTION=""
        fi
        PROMPT="${PROMPT//\{FEEDBACK_SECTION\}/$FEEDBACK_SECTION}"

        # Save prompt to temp file for debugging
        PROMPT_FILE="/tmp/autonomous-dev-prompt-$ITERATION.md"
        echo "$PROMPT" > "$PROMPT_FILE"
        log "💾 Prompt saved to: $PROMPT_FILE" "$BLUE"

        # Circuit breaker: Store current git commit before iteration
        COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")
        log "📍 Current commit: ${COMMIT_BEFORE:0:7}" "$BLUE"

        log "🤖 Invoking Codex (model: $CODEX_MODEL)..." "$BLUE"
        log "Command: $CODEX_CMD e $CODEX_FLAGS --model $CODEX_MODEL ${CODEX_CONFIG_OVERRIDES[*]} \"<prompt>\"" "$BLUE"

        if [ "$DRY_RUN" = true ]; then
            log "🏃 DRY RUN: Would execute Codex now" "$YELLOW"
            log "Prompt preview (first 200 chars):" "$YELLOW"
            echo "$PROMPT" | head -c 200
            echo "..."
            EXIT_CODE=0  # Simulate success in dry-run
        else
            # Change to project root
            cd "$PROJECT_ROOT" || exit 1

            # Invoke Codex with the prompt
            # Codex takes prompt as last positional argument
            set +e  # Temporarily disable exit on error to capture exit code
            $CODEX_CMD e $CODEX_FLAGS --model "$CODEX_MODEL" "${CODEX_CONFIG_OVERRIDES[@]}" "$PROMPT"
            EXIT_CODE=$?
            set -e  # Re-enable exit on error

            log "Codex exited with code: $EXIT_CODE" "$BLUE"
        fi

        # Circuit breaker: Check if git commit changed
        COMMIT_AFTER=$(git rev-parse HEAD 2>/dev/null || echo "none")

        if [ "$COMMIT_BEFORE" = "$COMMIT_AFTER" ]; then
            NO_PROGRESS_COUNT=$((NO_PROGRESS_COUNT + 1))
            log "⚠️  No git commit detected - no progress made ($NO_PROGRESS_COUNT/$MAX_NO_PROGRESS)" "$YELLOW"

            if [ $NO_PROGRESS_COUNT -ge $MAX_NO_PROGRESS ]; then
                echo ""
                log "╔════════════════════════════════════════════════════════╗" "$RED"
                log "║  🛑 CIRCUIT BREAKER TRIGGERED                         ║" "$RED"
                log "║  No commits for $MAX_NO_PROGRESS iterations.                     ║" "$RED"
                log "║  AI is not making progress. Human intervention needed.║" "$RED"
                log "╚════════════════════════════════════════════════════════╝" "$RED"
                echo ""
                log "Possible causes:" "$YELLOW"
                log "  - AI stuck in analysis loop without implementing" "$YELLOW"
                log "  - Quality gates preventing commits" "$YELLOW"
                log "  - Unclear requirements or tasks" "$YELLOW"
                log "  - Technical blockers" "$YELLOW"
                echo ""
                log "Last prompt: $PROMPT_FILE" "$RED"
                exit 1
            fi
        else
            # Progress made - reset counter
            NEW_COMMITS=$(git rev-list $COMMIT_BEFORE..$COMMIT_AFTER --count 2>/dev/null || echo "1")
            log "✅ Progress detected: $NEW_COMMITS new commit(s) - ${COMMIT_AFTER:0:7}" "$GREEN"
            NO_PROGRESS_COUNT=0
        fi
    fi

    # Handle exit codes
    case $EXIT_CODE in
        0)
            log "✅ Iteration $ITERATION completed successfully" "$GREEN"
            CONSECUTIVE_FAILURES=0

            # Archive feedback if it was processed (and commits were made)
            if [ -f "$FEEDBACK_FILE" ] && [ "$COMMIT_BEFORE" != "$COMMIT_AFTER" ]; then
                ARCHIVE_DIR="$PROJECT_ROOT/.spec-workflow/feedback/archive"
                mkdir -p "$ARCHIVE_DIR"
                ARCHIVE_FILE="$ARCHIVE_DIR/$(date +%Y-%m-%d-%H%M%S).md"
                mv "$FEEDBACK_FILE" "$ARCHIVE_FILE"
                log "📦 Feedback archived to: $(basename $ARCHIVE_FILE)" "$GREEN"
            fi
            ;;
        99)
            echo ""
            log "╔════════════════════════════════════════════════════════╗" "$GREEN"
            log "║  🎉 PROJECT COMPLETE!                                 ║" "$GREEN"
            log "║  All Phase 1 tasks done. Ready for UAT.              ║" "$GREEN"
            log "╚════════════════════════════════════════════════════════╝" "$GREEN"
            echo ""
            log "📊 Final Statistics:" "$GREEN"
            log "  Total iterations: $ITERATION"
            log "  Tasks completed: $COMPLETED_COUNT"
            log "  Time: $(date)"
            echo ""
            exit 0
            ;;
        1)
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            log "❌ Error encountered (failure $CONSECUTIVE_FAILURES of 3)" "$RED"

            if [ $CONSECUTIVE_FAILURES -ge 3 ]; then
                log "╔════════════════════════════════════════════════════════╗" "$RED"
                log "║  ⚠️  ESCALATION REQUIRED                              ║" "$RED"
                log "║  3 consecutive failures. Human intervention needed.   ║" "$RED"
                log "╚════════════════════════════════════════════════════════╝" "$RED"
                log "Last prompt: $PROMPT_FILE" "$RED"
                exit 1
            fi

            log "Retrying with next iteration..." "$YELLOW"
            ;;
        2)
            log "⏸️  Checkpoint reached - Human review requested" "$YELLOW"
            log "Please review progress and approve continuation." "$YELLOW"
            exit 2
            ;;
        *)
            log "❓ Unknown exit code: $EXIT_CODE" "$RED"
            log "Treating as error and escalating..." "$RED"
            exit 1
            ;;
    esac

    # Checkpoint check
    if [ $((ITERATION % CHECKPOINT_INTERVAL)) -eq 0 ]; then
        echo ""
        log "╔════════════════════════════════════════════════════════╗" "$YELLOW"
        log "║  📊 CHECKPOINT $((ITERATION / CHECKPOINT_INTERVAL)) REACHED                               ║" "$YELLOW"
        log "╚════════════════════════════════════════════════════════╝" "$YELLOW"
        echo ""
        log "Progress Summary:" "$YELLOW"
        log "  Iterations completed: $ITERATION"
        log "  Tasks completed: $COMPLETED_COUNT"
        log "  Tasks pending: $PENDING_COUNT"
        echo ""
        log "⏸️  Pausing for human review..." "$YELLOW"
        log "Run './scripts/autonomous-dev.sh' again to continue." "$YELLOW"
        exit 2
    fi

    # Brief pause between iterations
    sleep 2
done

# Max iterations reached
echo ""
log "╔════════════════════════════════════════════════════════╗" "$YELLOW"
log "║  ⚠️  MAX ITERATIONS REACHED                           ║" "$YELLOW"
log "║  Human review required before continuing.             ║" "$YELLOW"
log "╚════════════════════════════════════════════════════════╝" "$YELLOW"
echo ""
log "📊 Statistics:" "$YELLOW"
log "  Iterations completed: $MAX_ITERATIONS"
log "  Tasks completed: $COMPLETED_COUNT"
log "  Tasks pending: $PENDING_COUNT"
echo ""
exit 2
