# Development Workflow Context for SignalK Server

This document provides a proven, methodical workflow for developing SignalK server features with incremental validation at each step. This approach prioritizes reliability and visual confirmation over speed, using Chrome DevTools MCP for visual validation and performance monitoring.

**Last Validated**: 2026-01-02 with Chrome DevTools MCP, SignalK Server 2.19.0

## Prerequisites Validated

- ✅ Node.js 20+ installed
- ✅ Chrome installed with DevTools MCP integration
- ✅ SignalK server builds successfully (`npm run build`)
- ✅ Server starts with sample data (`bin/nmea-from-file`)
- ✅ Admin UI accessible at http://localhost:3000
- ✅ Live data flowing (21 deltas/second confirmed)
- ✅ Performance monitoring working (CLS: 0.00)

## Git Flow Strategy

### Branch Naming Convention

```
feature/<descriptive-name>
fix/<bug-description>
refactor/<component-name>
chore/<maintenance-task>
```

### Standard Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Incremental Commits**
   - Make small, testable changes
   - Commit after each validation step
   - Use conventional commit format:
     ```
     <type>: <subject>

     <body>

     <footer>
     ```
   - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

3. **Testing Before Merge**
   - All automated tests pass (`npm test`)
   - Visual validation complete
   - Performance impact assessed
   - No breaking changes

4. **Pull Request**
   - Include screenshots of visual changes
   - Document what was tested
   - Reference any related issues

## Incremental Development Template

For each feature, follow this cycle:

### Phase 1: Research & Planning

**Steps:**
1. Read `.llm/PATTERN_INDEX.md` for codebase patterns
2. Identify affected files using Glob/Grep
3. Read existing implementations
4. Document approach

**Validation:**
- [ ] All relevant files identified
- [ ] Existing patterns understood
- [ ] Plan documented in TODO list

**Example:**
```bash
# Find existing API patterns
grep -r "openApi" src/api/

# Find similar features
grep -r "course" src/
```

### Phase 2: Setup & Environment

**Steps:**
1. Start server with sample data
2. Launch Chrome and navigate to admin UI
3. Take baseline screenshots
4. Verify current functionality

**Commands:**
```bash
# Terminal 1: Start server with sample data
bin/nmea-from-file

# Terminal 2: Run tests in watch mode (optional)
npm run watch

# Chrome DevTools MCP will handle browser
```

**Validation:**
- [ ] Server running on port 3000
- [ ] Dashboard shows live data (deltas/second > 0)
- [ ] No errors in console
- [ ] Baseline screenshots captured

### Phase 3: Incremental Implementation

**For Each Logical Unit of Work:**

1. **Write/Modify Code**
   - Make ONE small change
   - Keep changes under 50-100 lines per commit
   - Update types if using TypeScript

2. **Build**
   ```bash
   npm run build
   ```
   - [ ] Build succeeds with no errors
   - [ ] TypeScript types validate

3. **Restart Server**
   ```bash
   # Kill previous server (Ctrl+C)
   bin/nmea-from-file
   ```
   - [ ] Server starts without errors
   - [ ] No warnings in startup logs
   - [ ] TSOA routes registered successfully

4. **Visual Validation**
   - Navigate to affected UI (e.g., http://localhost:3000/admin/#/databrowser)
   - Take screenshot
   - Verify changes appear correctly
   - Test interaction
   - [ ] Visual changes as expected
   - [ ] No layout breaks
   - [ ] No console errors

5. **Performance Check**
   - Use Chrome DevTools performance trace
   - Check delta throughput (should remain ~20+/sec)
   - Verify CLS score (should be < 0.1)
   - [ ] No performance degradation
   - [ ] CLS score acceptable
   - [ ] Delta throughput maintained

6. **Commit**
   ```bash
   git add <files>
   git commit -m "feat: add <specific change>

   - Implemented X
   - Updated Y
   - Tested with Z"
   ```

### Phase 4: Automated Testing

**After Implementation Complete:**

1. **Run Unit Tests**
   ```bash
   npm run test-only
   ```
   - [ ] All existing tests pass
   - [ ] New tests added for new functionality
   - [ ] Test coverage maintained/improved

2. **Run Full Test Suite**
   ```bash
   npm test
   ```
   - [ ] Build succeeds
   - [ ] All tests pass
   - [ ] Linting passes

3. **Fix Any Issues**
   - If tests fail, return to Phase 3
   - Make incremental fixes
   - Revalidate

### Phase 5: Integration Validation

**Complete System Test:**

1. **Restart with Fresh State**
   ```bash
   # Stop server
   # Clear any test data
   # Restart
   bin/nmea-from-file
   ```

2. **Manual Testing Checklist**
   - [ ] Dashboard loads and shows stats
   - [ ] Data Browser shows live data
   - [ ] New feature works as intended
   - [ ] No errors in Server Logs
   - [ ] Plugin status all "Started"
   - [ ] Connection status active

3. **Performance Validation**
   - [ ] Load time acceptable (< 3s for admin UI)
   - [ ] Data throughput maintained
   - [ ] No memory leaks (check uptime stats)
   - [ ] Browser DevTools shows no errors

4. **Cross-Feature Testing**
   - [ ] Existing features still work
   - [ ] No conflicts with plugins
   - [ ] API endpoints respond correctly

### Phase 6: Documentation & PR

1. **Update Documentation**
   - [ ] Code comments added where needed
   - [ ] API docs updated (if applicable)
   - [ ] README updated (if needed)

2. **Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   gh pr create --title "feat: Your feature title" \
     --body "$(cat <<'EOF'
   ## Summary
   - Bullet point 1
   - Bullet point 2

   ## Test plan
   - [x] Unit tests pass
   - [x] Visual validation complete
   - [x] Performance impact assessed

   ## Screenshots
   [Attach screenshots from validation]
   EOF
   )"
   ```

3. **PR Checklist**
   - [ ] Descriptive title following conventions
   - [ ] Summary of changes
   - [ ] Test plan documented
   - [ ] Screenshots attached (for UI changes)
   - [ ] No debug code or console.logs
   - [ ] Branch up to date with master

## Quick Reference Commands

### Server Management
```bash
# Start with NMEA sample data
bin/nmea-from-file

# Start with NMEA2000 sample data
bin/n2k-from-file

# Check if server is running
lsof -i :3000

# View server logs
tail -f ~/.signalk/*.log
```

### Build & Test
```bash
# Build everything
npm run build:all

# Build server only
npm run build

# Watch for changes
npm run watch

# Run tests
npm test

# Run tests only (no build/lint)
npm run test-only

# Lint and format
npm run format
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit with message
git commit -m "feat: descriptive message"

# Push to remote
git push origin feature/my-feature

# Create PR (requires gh cli)
gh pr create
```

### Chrome DevTools Validation

**Using MCP Tools:**
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__take_screenshot` - Capture visual state
- `mcp__chrome-devtools__take_snapshot` - Get accessibility tree
- `mcp__chrome-devtools__performance_start_trace` - Performance analysis
- `mcp__chrome-devtools__list_console_messages` - Check for errors

## Standardized Validation Workflow

**CRITICAL**: This 9-item validation checklist MUST be completed after EVERY code change during a refactoring or feature implementation session.

### The 9-Item Validation Checklist

After each code modification:

1. ✓ **Build succeeds**: `npm run build` (check for errors, not just warnings)
2. ✓ **No build errors in console**: Webpack should compile successfully
3. ✓ **Server restarts fresh**: `bin/nmea-from-file` (or appropriate script)
   - **CRITICAL**: Kill existing server first: `lsof -ti:3000 | xargs kill`
   - Start fresh to ensure NMEA playback is active
4. ✓ **Navigate to page**: Use Chrome DevTools MCP to navigate
5. ✓ **Page loads without JavaScript errors**: Check console messages
6. ✓ **Data updates LIVE**: **MUST validate timestamps are changing**
   - Wait 2-3 seconds and verify timestamps increment
   - If timestamps are static, NMEA file playback completed - restart server!
7. ✓ **All features work**: Test search, pause, filters, mode switches
8. ✓ **Visual parity maintained**: Screenshot comparison with baseline
9. ✓ **Performance metrics captured**: Record DOM nodes, memory, live update status

### Live Data Validation Commands

**Always verify live updates** using Chrome MCP:

```javascript
// Chrome MCP: evaluate_script
// Test live data updates - MUST show timestamps changing
() => {
  return new Promise(resolve => {
    const initialTimestamps = Array.from(document.querySelectorAll('.timestamp-cell'))
      .slice(1, 6)
      .map(td => td.textContent.trim())

    setTimeout(() => {
      const afterTimestamps = Array.from(document.querySelectorAll('.timestamp-cell'))
        .slice(1, 6)
        .map(td => td.textContent.trim())

      const changed = initialTimestamps.some((ts, i) => ts !== afterTimestamps[i])

      resolve({
        initialTimestamps,
        afterTimestamps,
        timestampsChanged: changed,
        changedCount: initialTimestamps.filter((ts, i) => ts !== afterTimestamps[i]).length,
        message: changed ? '✓ Data updating live' : '✗ No updates - RESTART SERVER'
      })
    }, 2000)
  })
}
```

**If test returns `✗ No updates`**: Server NMEA playback completed - restart server before proceeding!

### Performance Metrics to Capture

```javascript
// Chrome MCP: evaluate_script
// Capture performance metrics for benchmark tracking
() => ({
  totalPageNodes: document.querySelectorAll('*').length,
  tableRows: document.querySelectorAll('table tbody tr').length,
  memory: performance.memory ? {
    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
  } : 'Not available'
})
```

### Screenshot Validation

```javascript
// Chrome MCP commands
mcp__chrome-devtools__navigate_page(type: "reload", ignoreCache: true)
mcp__chrome-devtools__take_screenshot(filePath: ".screenshots/step-{N}-{description}.png")
mcp__chrome-devtools__list_console_messages()
```

Compare screenshots to ensure visual parity.

## Common Validation Checkpoints

### Dashboard Health Check
Navigate to: http://localhost:3000/admin/#/dashboard

Expected Stats:
- **Delta throughput**: > 20/second (with sample data)
- **Signal K Paths**: ~56 paths
- **WebSocket Clients**: ≥ 1
- **Connection Status**: nmeaFromFile active (yellow bar)
- **Plugin Status**: All "Started" (green)

### Data Browser Validation
Navigate to: http://localhost:3000/admin/#/databrowser

Verify:
- Live data updating (timestamps current)
- Values realistic:
  - Wind speed: ~4-8 m/s
  - Depth: ~12-13m
  - Position: ~60° lat, ~23° lon
  - Speed: ~3 m/s

### Performance Baseline
Expected Metrics:
- **CLS**: < 0.1 (0.00 is ideal)
- **Page Load**: < 3 seconds
- **FPS**: 60fps during interactions
- **Memory**: Stable over time

## Troubleshooting

### Server Won't Start
1. Check if port 3000 is in use: `lsof -i :3000`
2. Check build succeeded: `ls -la dist/`
3. Check node version: `node --version` (should be 20+)
4. View startup errors in console

### Tests Failing
1. Rebuild: `npm run build`
2. Check TypeScript errors: `tsc --noEmit`
3. Run single test: `npm run test-only -- --grep "test name"`
4. Clear and reinstall: `rm -rf node_modules && npm install`

### Visual Changes Not Appearing
1. Hard refresh browser: Cmd+Shift+R
2. Clear browser cache
3. Check browser console for errors
4. Verify build completed: check timestamps in `dist/`
5. Restart server to pick up changes

### Performance Degradation
1. Check delta throughput hasn't dropped
2. Run performance trace before/after changes
3. Check for memory leaks (increasing memory over time)
4. Profile with Chrome DevTools to identify bottlenecks

## Example Feature Development Flow

### Example: Adding a New API Endpoint

```bash
# 1. Create feature branch
git checkout -b feature/add-vessel-info-endpoint

# 2. Research existing patterns
grep -r "apiDoc" src/api/
# Read .llm/OPENAPI_CONTEXT.md

# 3. Implement endpoint (small change)
# Edit src/api/vessels/index.ts
npm run build

# 4. Start server and test
bin/nmea-from-file
# Navigate to http://localhost:3000/doc/openapi
# Screenshot: API docs show new endpoint

# 5. Test endpoint
curl http://localhost:3000/signalk/v2/api/vessels/self/info
# Screenshot: Response is correct

# 6. Commit
git add src/api/vessels/
git commit -m "feat: add vessel info endpoint

- Added GET /vessels/self/info endpoint
- Returns vessel metadata
- Updated OpenAPI documentation
- Tested with sample data"

# 7. Add tests
# Edit test/vessels.js
npm test
# All tests pass

# 8. Commit tests
git add test/vessels.js
git commit -m "test: add tests for vessel info endpoint"

# 9. Final validation
bin/nmea-from-file
# Take screenshots of:
# - API docs
# - Test results
# - Endpoint response

# 10. Create PR
git push origin feature/add-vessel-info-endpoint
gh pr create --title "feat: add vessel info endpoint"
```

## Notes

- **Methodical over fast**: Each step must validate before proceeding
- **Visual confirmation**: Screenshots prove it works
- **Small commits**: Easier to debug and review
- **Test continuously**: Catch issues early
- **Document as you go**: Don't leave it for later

## Related Documentation

- `.llm/PATTERN_INDEX.md` - Codebase patterns and search strategies
- `.llm/OPENAPI_CONTEXT.md` - REST API development guide
- `.llm/GITHUB_CONTEXT.md` - CI/CD and GitHub Actions
- `contributing.md` - Contribution guidelines
