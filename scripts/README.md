# Autonomous Development Scripts

This directory contains scripts for running AI-driven autonomous development.

## autonomous-dev.sh

Main script for running autonomous development sessions using Codex.

### Prerequisites

1. **Codex CLI installed and configured**
   ```bash
   # Check if Codex is available
   which codex

   # Test Codex
   codex e --dangerously-bypass-approvals-and-sandbox --model gpt-5.1-codex "Hello, Codex!"
   ```

2. **Steering documents created**
   - `.spec-workflow/steering/product.md`
   - `.spec-workflow/steering/design.md`
   - `.spec-workflow/steering/tech.md`

3. **Spec with tasks created**
   - `.spec-workflow/specs/mvp-foundation/tasks.md` (or your spec name)

### Quick Start

```bash
# Run with defaults (50 iterations, checkpoint every 10, gpt-5.1-codex model)
./scripts/autonomous-dev.sh

# Run with custom settings
./scripts/autonomous-dev.sh -i 100 -c 5 -m gpt-5.1-codex-mini

# Dry run to test without executing
./scripts/autonomous-dev.sh -d

# Show help
./scripts/autonomous-dev.sh --help
```

### Usage

```
./scripts/autonomous-dev.sh [OPTIONS]

Options:
  -h, --help              Show help message
  -i, --iterations N      Maximum iterations (default: 50)
  -c, --checkpoint N      Checkpoint interval (default: 10)
  -s, --spec NAME         Spec name (default: mvp-foundation)
  -m, --model MODEL       Codex model (default: gpt-5.1-codex)
                          Options: gpt-5.1-codex-max, gpt-5.1-codex,
                                   gpt-5.1-codex-mini, gpt-5-codex
  -d, --dry-run           Show what would be done without executing

Environment Variables:
  MAX_ITERATIONS          Override max iterations
  CHECKPOINT_INTERVAL     Override checkpoint interval
  SPEC_NAME               Override spec name
  CODEX_MODEL             Override Codex model
```

### Examples

```bash
# Use faster mini model for simple tasks
./scripts/autonomous-dev.sh -m gpt-5.1-codex-mini

# Run for longer with more frequent checkpoints
./scripts/autonomous-dev.sh -i 200 -c 5

# Work on different spec
./scripts/autonomous-dev.sh -s my-feature

# Combine options
./scripts/autonomous-dev.sh -i 100 -c 10 -m gpt-5.1-codex-max -s mvp-foundation

# Use environment variables
CODEX_MODEL=gpt-5.1-codex-max MAX_ITERATIONS=100 ./scripts/autonomous-dev.sh
```

### Exit Codes

The script handles these exit codes from Codex:

- **0**: Task completed successfully, continue to next iteration
- **1**: Error - quality gates failed or unclear requirement (escalates to human)
- **2**: Checkpoint reached - pauses for human review
- **99**: Project complete - all Phase 1 tasks done, ready for UAT

### Checkpoints

The script automatically pauses every N iterations (default: 10) for human review.

**What to review at checkpoints:**
1. Code quality and consistency
2. Architecture adherence
3. Test coverage
4. Progress direction
5. Any issues or blockers

**After reviewing:**
- Continue: Run the script again to continue
- Adjust: Update steering docs, then continue
- Pause: Take over manually
- Stop: Project complete or needs pivot

### Monitoring Progress

```bash
# Check task status
grep -E "\[.\]" .spec-workflow/specs/mvp-foundation/tasks.md

# View recent commits
git log --oneline -10

# Check test coverage
pnpm test:coverage

# View logs
tail -f autonomous-dev.log

# Check prompt history
ls -lt /tmp/autonomous-dev-prompt-*.md | head -5
```

### Troubleshooting

#### Codex not found
```bash
# Check if Codex is installed
which codex

# Verify it works
codex e --dangerously-bypass-approvals-and-sandbox --model gpt-5.1-codex "test"
```

#### Tasks not found
```bash
# Create the spec directory and tasks.md
mkdir -p .spec-workflow/specs/mvp-foundation
# Then create tasks.md with your task list
```

#### Script exits immediately
Check the log file for errors:
```bash
cat autonomous-dev.log
```

#### Quality gates failing
The script will retry up to 3 times. If still failing:
1. Review the prompt file: `/tmp/autonomous-dev-prompt-N.md`
2. Check what Claude tried to do
3. Fix blocking issues manually
4. Run script again

#### Too many iterations
Reduce max iterations or increase checkpoint frequency:
```bash
./scripts/autonomous-dev.sh -i 20 -c 5
```

### Safety Features

1. **Checkpoints**: Regular human review points
2. **Quality Gates**: Automated linting, type checking, testing
3. **Retry Logic**: Up to 3 retries on failures
4. **Escalation**: Stops and asks for help when stuck
5. **Iteration Limit**: Prevents runaway execution
6. **Logging**: All actions logged to file
7. **Prompt Preservation**: All prompts saved for debugging

### Model Selection Guide

- **gpt-5.1-codex-mini**: Fast, simple tasks (refactoring, simple features, 3-5 min per task)
- **gpt-5.1-codex**: Standard tasks, good balance (most features, 5-10 min per task)
- **gpt-5.1-codex-max**: Complex tasks requiring deep reasoning (architecture, 10-20 min per task)
- **gpt-5-codex**: Legacy model, not recommended for new projects

### Tips

1. **Start small**: Begin with 10-20 iterations
2. **Monitor closely**: Watch first few checkpoints carefully
3. **Update steering docs**: Keep them current as you learn
4. **Break down tasks**: Smaller tasks = better success rate
5. **Review regularly**: Don't let it run too long unattended
6. **Use version control**: Commit steering doc changes
7. **Test quality gates**: Ensure they work before starting
8. **Dry run first**: Test with `-d` flag before real run

### Integration with CI/CD

You can run this in CI/CD for continuous development:

```yaml
# .github/workflows/autonomous-dev.yml
name: Autonomous Development

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  auto-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Codex
        run: |
          # Install Codex CLI
          # Configure with API key from secrets

      - name: Run autonomous development
        run: |
          ./scripts/autonomous-dev.sh -i 10 -c 5 -m gpt-5.1-codex

      - name: Create PR if changes
        if: success()
        run: |
          # Create PR with changes
          # Tag for human review
```

### Advanced Usage

#### Custom Prompt Template

Edit the `PROMPT_TEMPLATE` variable in the script to customize the instructions given to Claude.

#### Multiple Specs

Run different specs in sequence:
```bash
./scripts/autonomous-dev.sh -s setup-infrastructure
./scripts/autonomous-dev.sh -s core-features
./scripts/autonomous-dev.sh -s ui-components
```

#### Parallel Development (Experimental)

Run multiple instances on different specs (ensure no conflicts):
```bash
./scripts/autonomous-dev.sh -s feature-a &
./scripts/autonomous-dev.sh -s feature-b &
wait
```

## Support

For issues or questions:
1. Check the logs: `autonomous-dev.log`
2. Review prompt files: `/tmp/autonomous-dev-prompt-*.md`
3. Consult AUTONOMOUS-DEV-GUIDE.md
4. Open an issue on GitHub
