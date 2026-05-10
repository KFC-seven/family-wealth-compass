# Full-Stack QA: Comprehensive Testing & Debugging

**Date**: 2026-05-11
**Decision**: Approach A — Architect-led domain split, parallel agents, local→deploy→cloud

## Scope

Full stack: 35 API routes, 60+ components, 7 cron jobs, 5 market data providers, 22 DB models.

## Test Domains (8 streams)

| # | Domain | Key Files | Test Types |
|---|--------|-----------|------------|
| D1 | API Endpoints | `src/app/api/**`, `src/server/api/**` | Integration, validation |
| D2 | Finance Services | `src/server/finance/**` | Unit (calculations, mappers) |
| D3 | Import Pipeline | `src/server/import/**`, `src/server/ocr/**`, `src/server/storage/**` | Unit + integration |
| D4 | Market Data | `src/server/market-data/**` | Unit (providers, registry, routing) |
| D5 | Jobs & Scheduling | `src/server/jobs/**` | Unit (registry, runner) + integration |
| D6 | AI Brief & Push | `src/server/ai/**`, `src/server/brief/**`, `src/server/push/**` | Unit + integration |
| D7 | Frontend Pages | `src/app/**/page.tsx`, `src/components/**` | Component, render |
| D8 | Auth & Security | `src/server/auth/**`, `src/server/security/**` | Unit + integration |

## Phases

1. **Architect Analysis** — Deep code audit, identify test gaps, create handoffs
2. **Parallel Test Writing** — 4-6 coders write tests simultaneously
3. **Bug Discovery & Fix** — Run tests, find bugs, fix them
4. **Integration Verification** — Full suite pass, smoke tests pass
5. **Deploy to ECS** — `deploy.sh` to 106.15.37.44
6. **Cloud Smoke Test** — `prod:smoke` + manual verification
7. **Cloud Bug Fixes** — Fix any production-specific issues
8. **Final Report** — Comprehensive markdown analysis

## Parallel Strategy

- Domains D1-D8 are independent → can test in parallel
- After tests written: run all, collect failures, dispatch fixes in parallel
- Git commit after each phase completion
- Auto-decide all configuration/approach questions

## Exit Criteria

- All unit tests pass (vitest)
- All smoke tests pass (7 scripts)
- ECS deployment healthy at 106.15.37.44
- All API endpoints return ok:true
- Frontend pages render without error
- Jobs execute successfully
- Market data providers return valid data
