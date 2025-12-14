# Scripts Moved

The autonomous development scripts have been moved to an independent repository:

**🔗 [steer-driven-runner](https://github.com/RyosukeMondo/steer-driven-runner)**

## What Was Moved

The following scripts have been rewritten in Python and moved to the independent package:

- `autonomous-dev.sh` → `steer-run` CLI command
- `monitor.py` → `steer-monitor` CLI command
- `post-feedback.sh` → `steer-feedback` CLI command

## Installation

```bash
# ⚡ Ultra-fast: Install globally with uv (recommended)
uv tool install git+https://github.com/RyosukeMondo/steer-driven-runner.git

# Or install with pip
pip install git+https://github.com/RyosukeMondo/steer-driven-runner.git
```

> **Why `uv tool install`?**
> - ⚡ Blazing fast installation
> - 🌍 Installs CLI commands globally (system-wide access)
> - 🔧 No need to activate virtual environments
> - 🚀 Perfect for CLI tools like steer-run, steer-monitor, steer-feedback

## Usage

```bash
# Run autonomous development (replaces ./scripts/autonomous-dev.sh)
steer-run -i 100 -c 10

# Monitor progress (replaces ./scripts/monitor.py)
steer-monitor

# Post feedback (replaces ./scripts/post-feedback.sh)
steer-feedback "Your feedback message" --priority HIGH
```

## Documentation

Full documentation available at:
https://github.com/RyosukeMondo/steer-driven-runner#readme
