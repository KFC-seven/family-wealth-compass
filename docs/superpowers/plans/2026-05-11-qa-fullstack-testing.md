# Full-Stack QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive testing of all completed features across 8 domains, bug discovery & fixing, ECS deployment, cloud verification, and analysis report.

**Architecture:** Architect agent first analyzes codebase and creates 8 domain handoffs. Then 4-6 coder agents write tests in parallel. Failures collected, bugs fixed in parallel. Final deploy→cloud-test→report cycle.

**Tech Stack:** vitest, tsx, TypeScript, Next.js 16, Prisma 7, PostgreSQL

---

## Phase 0: Git Commit Starting Point

- [ ] **Step 1: Verify clean working tree**

```bash
cd D:\Program\family-wealth-compass && git status
```

- [ ] **Step 2: Commit if dirty**

```bash
git add -A && git commit -m "pre-QA: checkpoint before full-stack testing"
```

---

## Phase 1: Architect Analysis (single agent, foreground)

### Task 1: Full codebase audit

**Files:** All `src/server/**`, `src/app/api/**`, `src/app/**/page.tsx`, `src/components/**`

- [ ] **Step 1: Launch architect agent to analyze entire codebase**

Agent: `architect`, prompt:
```
Analyze the family-wealth-compass codebase for comprehensive testing. Output 8 handoff files to .claude/handoffs/tasks/qa-<domain>.md.

For each domain, identify:
1. All source files to test
2. All exported functions/classes/endpoints
3. Existing test coverage gaps
4. Known edge cases and error paths
5. Mock dependencies needed
6. Specific test cases to write

Domains:
- D1: API Endpoints (src/app/api/*, src/server/api/*)
- D2: Finance Services (src/server/finance/*)
- D3: Import Pipeline (src/server/import/*, src/server/ocr/*, src/server/storage/*)
- D4: Market Data (src/server/market-data/*)
- D5: Jobs & Scheduling (src/server/jobs/*)
- D6: AI Brief & Push (src/server/ai/*, src/server/brief/*, src/server/push/*)
- D7: Frontend Pages (src/app/*/page.tsx, src/components/*)
- D8: Auth & Security (src/server/auth/*, src/server/security/*)

For each domain handoff, use format:
# Task: QA Testing - <Domain>
## Files to test — list every file with exports
## Test gaps — what's missing
## Test cases — specific tests to write (with mock strategy)
## Edge cases — error paths, boundary conditions
## Dependencies — what needs mocking (prisma, fetch, etc.)

Write all 8 handoff files. Be thorough — this is the blueprint for all testing.
```

- [ ] **Step 2: Verify handoffs created**

```bash
ls -la .claude/handoffs/tasks/qa-*.md
```

Expected: 8 files (qa-d1-api-endpoints.md through qa-d8-auth-security.md)

- [ ] **Step 3: Commit architect analysis**

```bash
git add .claude/handoffs/tasks/qa-*.md docs/superpowers/
git commit -m "qa: architect analysis - 8 domain handoffs for full-stack testing"
```

---

## Phase 2: Parallel Test Writing (4-6 coder agents in parallel)

### Task 2: Launch parallel test-writing agents

- [ ] **Step 1: Launch D1 + D2 agents (batch 1)**

Two parallel Agent calls:
- Agent 1 (coder): Read `.claude/handoffs/tasks/qa-d1-api-endpoints.md`, write unit/integration tests, run them, fix any test bugs, report results to `.claude/handoffs/summaries/qa-d1.md`
- Agent 2 (coder): Read `.claude/handoffs/tasks/qa-d2-finance-services.md`, write unit tests, run them, fix any test bugs, report results to `.claude/handoffs/summaries/qa-d2.md`

- [ ] **Step 2: Launch D3 + D4 agents (batch 1 continued)**

- Agent 3 (coder): Read `.claude/handoffs/tasks/qa-d3-import-pipeline.md`, write unit tests (extending existing transaction-saver tests), run them, fix any test bugs, report to `.claude/handoffs/summaries/qa-d3.md`
- Agent 4 (coder): Read `.claude/handoffs/tasks/qa-d4-market-data.md`, write unit tests for providers/registry/routing, run them, fix test bugs, report to `.claude/handoffs/summaries/qa-d4.md`

- [ ] **Step 3: Launch D5 + D6 agents (batch 2, after batch 1)**

- Agent 5 (coder): Read `.claude/handoffs/tasks/qa-d5-jobs-scheduling.md`, write unit tests, run them, fix test bugs, report to `.claude/handoffs/summaries/qa-d5.md`
- Agent 6 (coder): Read `.claude/handoffs/tasks/qa-d6-ai-brief-push.md`, write unit tests, run them, fix test bugs, report to `.claude/handoffs/summaries/qa-d6.md`

- [ ] **Step 4: Launch D7 + D8 agents (batch 2 continued)**

- Agent 7 (coder): Read `.claude/handoffs/tasks/qa-d7-frontend-pages.md`, write component tests, run them, fix test bugs, report to `.claude/handoffs/summaries/qa-d7.md`
- Agent 8 (coder): Read `.claude/handoffs/tasks/qa-d8-auth-security.md`, write unit tests, run them, fix test bugs, report to `.claude/handoffs/summaries/qa-d8.md`

- [ ] **Step 5: Verify all summaries created**

```bash
ls -la .claude/handoffs/summaries/qa-*.md
```

- [ ] **Step 6: Commit test additions**

```bash
git add src/**/__tests__/ tests/
git add .claude/handoffs/summaries/qa-*.md
git commit -m "qa: add comprehensive unit tests across 8 domains"
```

---

## Phase 3: Bug Discovery & Fixing

### Task 3: Run full test suite and collect failures

- [ ] **Step 1: Run all vitest tests**

```bash
cd D:\Program\family-wealth-compass && npx vitest run 2>&1 | tee test-output.txt
```

- [ ] **Step 2: Run all smoke tests (if DB available)**

```bash
npm run api:smoke 2>&1 || true
npm run auth:smoke 2>&1 || true
npm run import:smoke 2>&1 || true
npm run manual-import:smoke 2>&1 || true
npm run brief:smoke 2>&1 || true
```

- [ ] **Step 3: Parse failures and categorize**

Read test output, categorize failures:
- Type A: Test bug (test written incorrectly, code is correct)
- Type B: Code bug (code has real defect)
- Type C: Configuration (env, DB, missing dependency)

- [ ] **Step 4: Fix Type A (test bugs) inline**

Edit problematic test files directly. Re-run to verify fixes.

- [ ] **Step 5: Fix Type B (code bugs) via parallel agents**

For each domain with code bugs, launch coder agent:
- Agent: Read summary, fix the specific bug, add regression test, report

- [ ] **Step 6: Fix Type C (config issues) inline**

Check .env, database connectivity, mock setup. Fix configuration.

- [ ] **Step 7: Re-run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit bug fixes**

```bash
git add -A
git commit -m "qa: fix bugs discovered during full-stack testing"
```

---

## Phase 4: Local Integration Verification

### Task 4: Full local verification

- [ ] **Step 1: Build check**

```bash
npm run build 2>&1
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Start dev server**

```bash
npm run dev &
sleep 5
```

- [ ] **Step 3: Run API smoke test**

```bash
npm run api:smoke
```
Expected: 10/10 pass.

- [ ] **Step 4: Run auth smoke test**

```bash
npm run auth:smoke
```
Expected: 6/6 pass.

- [ ] **Step 5: Run deploy check**

```bash
npm run deploy:check
```
Expected: Pass with no critical failures.

- [ ] **Step 6: Stop dev server, commit**

```bash
git add -A && git commit -m "qa: local integration verification complete"
```

---

## Phase 5: Deploy to ECS

### Task 5: Deploy to Alibaba Cloud ECS

- [ ] **Step 1: Run deploy check against production config**

```bash
NODE_ENV=production npm run deploy:check
```

- [ ] **Step 2: Deploy via SSH**

```bash
ssh root@106.15.37.44 'bash -s' < deploy.sh
```

- [ ] **Step 3: Verify health endpoint**

```bash
curl -s http://106.15.37.44/api/health | head -c 500
```

Expected: `{"ok":true,...}`

- [ ] **Step 4: Run production smoke test**

```bash
npm run prod:smoke
```

- [ ] **Step 5: Commit deployment record**

```bash
git add -A && git commit -m "qa: ECS deployment verified after testing"
```

---

## Phase 6: Cloud Bug Fixing (if needed)

### Task 6: Fix cloud-specific issues

- [ ] **Step 1: Check PM2 logs for errors**

```bash
ssh root@106.15.37.44 'pm2 logs family-wealth-compass --lines 50 --nostream'
```

- [ ] **Step 2: Check nginx logs**

```bash
ssh root@106.15.37.44 'tail -50 /var/log/nginx/error.log'
```

- [ ] **Step 3: Fix any issues found**

For each cloud issue:
1. Identify root cause
2. Fix locally
3. Re-deploy
4. Verify fix

- [ ] **Step 4: Re-run prod smoke after fixes**

```bash
npm run prod:smoke
```
Expected: All pass.

- [ ] **Step 5: Commit cloud fixes**

```bash
git add -A && git commit -m "qa: cloud-specific bug fixes after ECS testing"
```

---

## Phase 7: Analysis Report

### Task 7: Generate comprehensive QA report

- [ ] **Step 1: Collect all test results**

Gather data from:
- vitest test output
- Smoke test results
- Architect handoffs
- Coder summaries
- Deployment logs
- Cloud test results

- [ ] **Step 2: Write analysis report**

Save to `docs/superpowers/reports/2026-05-11-qa-analysis-report.md` with sections:
1. Executive Summary
2. Test Coverage by Domain (counts, percentages)
3. Bugs Found & Fixed (table with severity)
4. Deployment Status
5. Cloud Verification Results
6. Remaining Gaps / Known Issues
7. Recommendations

- [ ] **Step 3: Commit final report**

```bash
git add docs/superpowers/reports/
git commit -m "qa: final analysis report"
```

---

## Summary

| Phase | Tasks | Agents | Parallel |
|-------|-------|--------|----------|
| 0: Checkpoint | 1 | 0 | No |
| 1: Architect | 1 | 1 (architect) | No |
| 2: Test Writing | 5 | 8 (coders) | Yes (batches of 4) |
| 3: Bug Fixing | 8 | 3-4 (coders) | Yes |
| 4: Local Verify | 6 | 0 | No |
| 5: Deploy ECS | 5 | 0 | No |
| 6: Cloud Fix | 5 | 0-2 | Maybe |
| 7: Report | 3 | 0 | No |

**Total estimated agents:** 1 architect + 8 coders = 9 agent invocations
