# Performance Benchmark Context for DataBrowser Refactoring

**Purpose**: Guide for collecting and tracking performance benchmarks during the DataBrowser refactoring project.

## Quick Reference

**Before making code changes**: Capture current metrics
**After each refactor step**: Re-measure and compare

## Benchmark Files

- **`.benchmarks/BENCHMARK_TRACKING.md`** - Main tracking document with all results
- **`.benchmarks/collect-benchmark.sh`** - Automated collection helper script
- **`.benchmarks/data/`** - Raw benchmark data files
- **`.screenshots/`** - Visual comparison screenshots

## How to Collect Benchmarks

### Method 1: Chrome DevTools MCP (Preferred)

```javascript
// 1. Navigate to DataBrowser
await mcp__chrome-devtools__navigate_page({
  type: "url",
  url: "http://localhost:3000/admin/#/databrowser"
})

// 2. Run performance trace
const trace = await mcp__chrome-devtools__performance_start_trace({
  reload: true,
  autoStop: true
})

// Extract from trace results:
// - LCP (Largest Contentful Paint)
// - CLS (Cumulative Layout Shift)
// - TTFB (Time to First Byte)
// - Render delays

// 3. Take screenshot for visual comparison
await mcp__chrome-devtools__take_screenshot({
  filePath: `.screenshots/step-${STEP_NUMBER}-databrowser.png`
})

// 4. Check for console errors
await mcp__chrome-devtools__list_console_messages({
  types: ["error"]
})

// 5. Count DOM nodes (from accessibility snapshot)
const snapshot = await mcp__chrome-devtools__take_snapshot()
// Count table rows or elements
```

### Method 2: Helper Script

```bash
# From project root
.benchmarks/collect-benchmark.sh "step-3-fix-state-mutations"

# Follow prompts to fill in measurements
```

## Key Metrics to Track

### Critical Performance Metrics

| Metric | Description | Target | How to Measure |
|--------|-------------|--------|----------------|
| **LCP** | Largest Contentful Paint | < 200ms | Chrome DevTools performance trace |
| **CLS** | Cumulative Layout Shift | < 0.1 | Chrome DevTools performance trace |
| **DOM Nodes** | Number of rendered elements | < 100 for virtualization | Count from accessibility snapshot |
| **Render Time** | Time to first paint of table | < 500ms | Performance trace render delay |

### Secondary Metrics

| Metric | Description | Target | How to Measure |
|--------|-------------|--------|----------------|
| **TTFB** | Time to First Byte | < 50ms | Performance trace |
| **Page Load** | Total load time | < 2s | Performance trace bounds |
| **FPS** | Frames per second during scroll | 60fps | Performance trace during scroll |
| **Memory** | Memory usage over time | Stable | Chrome DevTools Memory tab |
| **Console Errors** | JavaScript errors | 0 | list_console_messages |

## Benchmark Workflow for Each Step

### Pre-Change Benchmark
1. ✅ Current code is working
2. ✅ Server running (`bin/nmea-from-file`)
3. 📸 Capture baseline screenshot
4. 📊 Run performance trace
5. 📝 Document current metrics

### Make Code Changes
1. Edit files
2. Build: `npm run build` (from packages/server-admin-ui or root)
3. Restart server if needed

### Post-Change Benchmark
1. ✅ Build succeeds
2. ✅ Server running
3. ✅ Page loads without errors
4. 📸 Capture new screenshot
5. 📊 Run performance trace
6. 📝 Document new metrics
7. 📊 **Compare to previous step**
8. ✅ Validate improvements

### Update Tracking Document
```bash
# Edit .benchmarks/BENCHMARK_TRACKING.md
# Fill in the STEP section with:
# - Date
# - Commit hash
# - All metrics
# - Validation checkboxes
# - Notes/observations
```

## Validation Checklist Template

After each benchmark collection:

```markdown
### Validation Checklist
- [ ] Build succeeds: `npm run build`
- [ ] Server starts: `bin/nmea-from-file`
- [ ] Page loads without errors
- [ ] No console errors
- [ ] Data updates in real-time
- [ ] Visual appearance matches baseline (or intended change)
- [ ] Performance metrics collected
- [ ] Metrics updated in BENCHMARK_TRACKING.md
- [ ] Screenshot captured for comparison
```

## Interpreting Results

### Good Signs ✅
- LCP decreased or stayed same
- CLS remained < 0.1
- DOM nodes decreased (especially after virtualization)
- No new console errors
- Visual appearance unchanged (unless intentional)
- Smooth 60fps scrolling

### Warning Signs ⚠️
- LCP increased significantly (> 50ms regression)
- CLS increased (> 0.05 regression)
- New console errors appeared
- Visual layout broken
- Choppy scrolling
- Memory increasing over time

### What to Do If Performance Regresses

1. **Document the regression** in BENCHMARK_TRACKING.md
2. **Investigate the cause**:
   - Check browser console for errors
   - Review code changes
   - Use React DevTools Profiler
3. **Options**:
   - Adjust implementation approach
   - Rollback the change: `git reset --hard <previous-commit>`
   - Accept minor regression if offset by other benefits

## Example: Collecting Benchmark for Step 3

```bash
# 1. Ensure baseline captured (STEP 1)
# 2. Make code changes for Step 3
# 3. Build
npm run build

# 4. Restart server
# Ctrl+C in terminal running server
bin/nmea-from-file

# 5. Collect benchmark
# Use Chrome MCP tools or:
.benchmarks/collect-benchmark.sh "step-3-fix-state-mutations"

# 6. Use Chrome DevTools MCP to collect metrics:
# - Navigate, trace, screenshot, console check

# 7. Update BENCHMARK_TRACKING.md:
# - Fill in all [MEASURE] placeholders
# - Check all validation boxes
# - Add notes if any issues

# 8. Commit changes
git add .benchmarks/
git commit -m "benchmark: captured metrics for step 3"
```

## Comparing Baseline vs Current

```bash
# Compare screenshots visually
ls -la .screenshots/
# baseline-databrowser.png
# step-3-databrowser.png

# Review metrics in BENCHMARK_TRACKING.md
# Look for:
# - LCP change
# - CLS change
# - DOM node count change
# - Any regressions
```

## Common Issues & Solutions

### Issue: Can't measure with many rows (only 16 in sample data)

**Solution**: The sample data has limited paths. The real benefit shows with 18k+ paths. Document:
- Current performance with ~16 rows
- Expected improvement calculation
- Note: "Performance gains will be more significant with full dataset"

### Issue: Measurements vary between runs

**Solution**:
- Run trace 2-3 times, use average
- Ensure no other heavy processes running
- Use same browser/conditions for all measurements

### Issue: Changes don't affect performance measurably

**Some refactors** (like fixing state mutations) are foundations for later improvements. Document:
- "No significant performance change expected"
- "Enables Step 4 memoization to work correctly"

## Integration with Development Workflow

From `.llm/WORKFLOW_CONTEXT.md` Phase 3, add:

**After each code change:**
```markdown
5. **Performance Check** (NEW)
   - Use Chrome DevTools performance trace
   - Collect metrics using benchmark system
   - Compare to baseline/previous step
   - [ ] No performance degradation
   - [ ] Metrics documented in BENCHMARK_TRACKING.md
```

## For Agents

When working on DataBrowser refactoring:

1. **READ** `.benchmarks/BENCHMARK_TRACKING.md` first
2. **BEFORE changes**: Note current performance state
3. **AFTER changes**: Collect new benchmarks
4. **COMPARE**: Did performance improve as expected?
5. **UPDATE**: Fill in all metrics in tracking document
6. **VALIDATE**: All checkboxes must pass

**Red flags to watch for:**
- LCP increased > 50ms
- CLS > 0.1
- New console errors
- Choppy scrolling
- Memory leaks (increasing over time)

## Related Files

- `.llm/WORKFLOW_CONTEXT.md` - Development workflow (includes benchmark steps)
- `.llm/PATTERN_INDEX.md` - Codebase patterns
- `.benchmarks/BENCHMARK_TRACKING.md` - **Main tracking document**
- `.benchmarks/collect-benchmark.sh` - Collection helper script
