# DataBrowser Performance Benchmark Tracking

**Purpose**: Track performance metrics at each refactoring step to validate improvements.

## Methodology

After each code change:
1. Rebuild admin UI: `npm run build` (in packages/server-admin-ui or root)
2. Restart server: `bin/nmea-from-file`
3. Navigate to DataBrowser: http://localhost:3000/admin/#/databrowser
4. Capture metrics using Chrome DevTools MCP
5. Compare to baseline and previous step

## Key Metrics

### Critical Metrics
- **LCP (Largest Contentful Paint)**: Target < 200ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1
- **DOM Nodes**: Track reduction (baseline ~16 rows visible)
- **Render Time**: Initial render of table

### Secondary Metrics
- **TTFB (Time to First Byte)**: Server response time
- **Page Load Time**: Total time to interactive
- **Memory Usage**: Track for memory leaks
- **FPS during scroll**: Should maintain 60fps

## Benchmark Results

---

## BASELINE (Before Refactoring)

**Date**: 2026-01-02
**Commit**: Initial state before refactoring
**Branch**: refactor/databrowser-performance (start)

### Metrics
- **LCP**: 159ms ✓ (excellent)
- **CLS**: 0.02 ✓ (excellent)
- **TTFB**: 2ms
- **Render Delay**: 157ms
- **DOM Nodes**: ~16 visible rows (sample data)
- **Page Behavior**: Live data updating, timestamps changing

### Notes
- Using NMEA sample data (`bin/nmea-from-file`)
- ~16 data paths visible
- Current implementation: Direct state mutation, full re-renders
- Baseline is already performant with small dataset
- **Expected issue**: Performance degrades significantly with 18k+ paths

### Screenshot
`.screenshots/baseline-databrowser.png`

---

## STEP 2: Added react-window dependency

**Date**: 2026-01-02
**Commit**: 3d0e3bab
**Changes**: Added react-window@^1.8.10 to package.json

### Metrics
- **LCP**: [PENDING]
- **CLS**: [PENDING]
- **DOM Nodes**: [PENDING]
- **Status**: Dependency added, no code changes yet

### Validation
- ✓ react-window installed (v1.8.11)
- ✓ Page still loads correctly
- ✓ No regression expected (no code changes)

---

## STEP 3: Fix State Mutations

**Date**: [PENDING]
**Commit**: [PENDING]
**Changes**: Replace direct state mutation with immutable setState

### Expected Impact
- **Performance**: No significant change expected
- **React Behavior**: Fixed reconciliation, proper memo/shouldUpdate behavior
- **Rationale**: Foundation for memoization in Step 4

### Metrics
- **LCP**: [MEASURE AFTER IMPLEMENTATION]
- **CLS**: [MEASURE AFTER IMPLEMENTATION]
- **DOM Nodes**: [MEASURE AFTER IMPLEMENTATION]
- **Console Errors**: Should be 0

### Validation Checklist
- [ ] Build succeeds
- [ ] No console errors
- [ ] Data still updates live
- [ ] Visual appearance unchanged
- [ ] Screenshot comparison matches baseline

---

## STEP 4: Memoize Table Row Component

**Date**: [PENDING]
**Commit**: [PENDING]
**Changes**: Extract DataRow component with React.memo

### Expected Impact
- **Performance**: 10-40% reduction in re-renders
- **Visible Change**: None (visual parity)
- **Rationale**: Only changed rows re-render

### Metrics
- **LCP**: [MEASURE AFTER IMPLEMENTATION]
- **CLS**: [MEASURE AFTER IMPLEMENTATION]
- **Re-renders**: Track with React DevTools Profiler
- **Console Errors**: Should be 0

### Validation Checklist
- [ ] Build succeeds
- [ ] Fewer re-renders in React DevTools
- [ ] Data still updates live
- [ ] Visual appearance unchanged

---

## STEP 5: Add Virtualization

**Date**: [PENDING]
**Commit**: [PENDING]
**Changes**: Replace Table with FixedSizeList from react-window

### Expected Impact
- **Performance**: 600x reduction in DOM nodes (18k → 30)
- **Visible Change**: Scrollable list with same appearance
- **Rationale**: Critical for large datasets

### Metrics
- **LCP**: [MEASURE AFTER IMPLEMENTATION]
- **CLS**: [MEASURE AFTER IMPLEMENTATION]
- **DOM Nodes**: Should be < 100 (only visible rows)
- **Scroll FPS**: Should maintain 60fps
- **Console Errors**: Should be 0

### Validation Checklist
- [ ] Build succeeds
- [ ] DOM node count drastically reduced
- [ ] Smooth scrolling
- [ ] Data updates in viewport
- [ ] Visual appearance similar to baseline

---

## STEP 6-8: BaconJS Integration

**Date**: [PENDING]
**Commit**: [PENDING]
**Changes**: Add DataStore, wire WebSocket, per-row subscriptions

### Expected Impact
- **Performance**: Sub-millisecond updates, only visible rows process deltas
- **Visible Change**: None (visual parity)
- **Rationale**: Granular reactivity, auto-unsubscribe when scrolled away

### Metrics
- **LCP**: [MEASURE AFTER IMPLEMENTATION]
- **CLS**: [MEASURE AFTER IMPLEMENTATION]
- **Update Latency**: < 1ms per delta
- **Memory**: Stable over time (no leaks)
- **Console Errors**: Should be 0

### Validation Checklist
- [ ] Build succeeds
- [ ] Only visible rows update
- [ ] Scrolling updates subscriptions
- [ ] No memory leaks over 5 minutes
- [ ] Delta throughput maintained (> 20/sec)

---

## STEP 9: Memoize Filter/Sort

**Date**: [PENDING]
**Commit**: [PENDING]
**Changes**: Add useMemo for expensive operations

### Expected Impact
- **Performance**: Reduce unnecessary recalculations
- **Visible Change**: None (visual parity)
- **Rationale**: Filter/sort only when dependencies change

### Metrics
- **LCP**: [MEASURE AFTER IMPLEMENTATION]
- **CLS**: [MEASURE AFTER IMPLEMENTATION]
- **Recalculation Count**: Track in profiler
- **Console Errors**: Should be 0

---

## FINAL VALIDATION (Step 10)

**Date**: [PENDING]
**Commit**: [PENDING]

### Complete Comparison

| Metric | Baseline | After Refactor | Change |
|--------|----------|----------------|--------|
| LCP | 159ms | [MEASURE] | [CALCULATE] |
| CLS | 0.02 | [MEASURE] | [CALCULATE] |
| DOM Nodes | ~16 visible | [MEASURE] | [CALCULATE] |
| TTFB | 2ms | [MEASURE] | [CALCULATE] |
| Re-renders | Full table | Per-row only | [MEASURE] |
| Memory (5min) | [BASELINE] | [MEASURE] | [CALCULATE] |

### Success Criteria
- ✓ All features working (search, filter, pause, meta, raw)
- ✓ No console errors
- ✓ Visual parity maintained
- ✓ Performance maintained or improved
- ✓ Delta throughput > 20/sec
- ✓ CLS < 0.1
- ✓ Smooth scrolling (60fps)

---

## Benchmark Collection Commands

```bash
# Start server
bin/nmea-from-file

# Build admin UI (if code changed)
npm run build
# OR from root:
npm run build:all
```

### Chrome DevTools MCP Commands
```javascript
// Navigate to page
mcp__chrome-devtools__navigate_page({
  type: "url",
  url: "http://localhost:3000/admin/#/databrowser"
})

// Capture screenshot
mcp__chrome-devtools__take_screenshot({
  filePath: ".screenshots/step-X-databrowser.png"
})

// Run performance trace
mcp__chrome-devtools__performance_start_trace({
  reload: true,
  autoStop: true
})

// Check console for errors
mcp__chrome-devtools__list_console_messages({
  types: ["error"]
})

// Take accessibility snapshot (count DOM nodes)
mcp__chrome-devtools__take_snapshot()
```

### Manual Validation
1. Visual check: Does it look correct?
2. Functional check: Does filtering/search work?
3. Data flow check: Are timestamps updating?
4. Performance feel: Is scrolling smooth?

---

## Notes for Agents

When working on DataBrowser refactoring:
1. **Always check this file** before and after changes
2. **Update metrics** after each step
3. **Compare to baseline** - did performance improve or regress?
4. **Document unexpected findings** in Notes section
5. **Capture screenshots** for visual comparison

If performance regresses:
1. Document the regression
2. Investigate cause
3. Consider rollback
4. Adjust approach

Performance improvements should be **measurable and reproducible**.
