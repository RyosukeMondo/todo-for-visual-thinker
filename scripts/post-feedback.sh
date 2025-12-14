#!/usr/bin/env bash
#
# Post async feedback for AI agent
#
# Usage:
#   ./scripts/post-feedback.sh "Your feedback message"
#   ./scripts/post-feedback.sh --priority HIGH "Critical bug description"
#   ./scripts/post-feedback.sh --type VISUAL "Missing canvas zoom controls"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FEEDBACK_FILE="$PROJECT_ROOT/.spec-workflow/feedback/pending.md"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
PRIORITY="MEDIUM"
TYPE="FEEDBACK"
MESSAGE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--priority)
            PRIORITY="$2"
            shift 2
            ;;
        -t|--type)
            TYPE="$2"
            shift 2
            ;;
        --stop)
            # Emergency stop - graceful shutdown
            TYPE="STOP_REQUEST"
            PRIORITY="CRITICAL"
            MESSAGE="Emergency stop requested by human. Please complete current iteration and exit gracefully."
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS] <message>"
            echo ""
            echo "Options:"
            echo "  -p, --priority LEVEL    Priority: LOW, MEDIUM, HIGH, CRITICAL (default: MEDIUM)"
            echo "  -t, --type TYPE         Type: BUG, FEATURE, IMPROVEMENT, VISUAL (default: FEEDBACK)"
            echo "  --stop                  Emergency stop: AI will exit after current iteration"
            echo "  -h, --help              Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 \"Web UI doesn't show todos from database\""
            echo "  $0 --priority HIGH \"Missing todo list display\""
            echo "  $0 --type VISUAL --priority HIGH \"Canvas needs zoom controls\""
            echo "  $0 --stop  # Graceful emergency stop"
            exit 0
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

if [ -z "$MESSAGE" ]; then
    echo -e "${YELLOW}Error: Message is required${NC}"
    echo "Usage: $0 [OPTIONS] <message>"
    echo "Use --help for more information"
    exit 1
fi

# Create feedback entry
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Check if pending.md already exists
if [ -f "$FEEDBACK_FILE" ]; then
    echo -e "${BLUE}Appending to existing pending feedback...${NC}"
    echo "" >> "$FEEDBACK_FILE"
    echo "---" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
fi

# Append feedback
cat >> "$FEEDBACK_FILE" << EOF
## $MESSAGE
**Date:** $TIMESTAMP
**Priority:** $PRIORITY
**Type:** $TYPE

**Description:**
$MESSAGE

**Status:** PENDING (awaiting AI agent processing)

**Posted by:** Human (async feedback)
EOF

echo -e "${GREEN}✓ Feedback posted successfully!${NC}"
echo ""
echo -e "${BLUE}Feedback location:${NC} $FEEDBACK_FILE"
echo -e "${BLUE}Priority:${NC} $PRIORITY"
echo -e "${BLUE}Type:${NC} $TYPE"
echo ""
echo -e "${YELLOW}Note:${NC} AI agent will read this feedback on the next iteration."
echo "It will consider your feedback when determining what to implement next."
echo ""
echo -e "${BLUE}To view pending feedback:${NC}"
echo "  cat $FEEDBACK_FILE"
echo ""
echo -e "${BLUE}To edit feedback:${NC}"
echo "  vim $FEEDBACK_FILE"
