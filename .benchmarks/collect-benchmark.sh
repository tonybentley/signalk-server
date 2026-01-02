#!/bin/bash
# Automated Benchmark Collection Script
# Usage: .benchmarks/collect-benchmark.sh <step-name>

STEP_NAME=${1:-"unknown"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR=".benchmarks/data"
SCREENSHOT_DIR=".screenshots"

mkdir -p "$OUTPUT_DIR"
mkdir -p "$SCREENSHOT_DIR"

echo "📊 Collecting benchmarks for: $STEP_NAME"
echo "⏰ Timestamp: $TIMESTAMP"

# Check if server is running
if ! lsof -i :3000 > /dev/null 2>&1; then
    echo "❌ Error: SignalK server not running on port 3000"
    echo "   Start server with: bin/nmea-from-file"
    exit 1
fi

echo "✓ Server running on port 3000"

# Create benchmark data file
BENCHMARK_FILE="$OUTPUT_DIR/${STEP_NAME}_${TIMESTAMP}.txt"

cat > "$BENCHMARK_FILE" <<EOF
# Benchmark Data: $STEP_NAME
# Timestamp: $TIMESTAMP
# Commit: $(git rev-parse --short HEAD)
# Branch: $(git branch --show-current)

## System Info
Node Version: $(node --version)
Platform: $(uname -s)
Date: $(date)

## Manual Metrics (Fill in from Chrome DevTools)

LCP: [MEASURE]
CLS: [MEASURE]
TTFB: [MEASURE]
DOM Nodes: [COUNT]
Page Load Time: [MEASURE]
Console Errors: [CHECK]

## Notes
[Add observations here]

## Chrome DevTools Commands Used

# Navigate to page:
mcp__chrome-devtools__navigate_page({ type: "url", url: "http://localhost:3000/admin/#/databrowser" })

# Performance trace:
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })

# Screenshot:
mcp__chrome-devtools__take_screenshot({ filePath: "$SCREENSHOT_DIR/${STEP_NAME}_${TIMESTAMP}.png" })

# Console errors:
mcp__chrome-devtools__list_console_messages({ types: ["error"] })

# DOM snapshot:
mcp__chrome-devtools__take_snapshot()

EOF

echo "✓ Created benchmark file: $BENCHMARK_FILE"
echo ""
echo "📋 Next steps:"
echo "   1. Open browser to http://localhost:3000/admin/#/databrowser"
echo "   2. Use Chrome DevTools MCP to collect metrics"
echo "   3. Update $BENCHMARK_FILE with measurements"
echo "   4. Update .benchmarks/BENCHMARK_TRACKING.md with results"
echo ""
echo "🔍 Quick validation checks:"
echo "   - Page loads without errors"
echo "   - Data updates in real-time"
echo "   - Filtering/search works"
echo "   - Scrolling is smooth"
