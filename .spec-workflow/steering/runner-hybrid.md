# Steer-Driven Runner: Hybrid Orchestration & Dashboard Vision

## Objective
Evolve the steer-driven-runner into a hybrid system: Python ingestion/orchestration (FastAPI) plus React/TypeScript dashboard. Focus on metrics-first visibility, contract-driven interfaces, and ultra-fast developer workflows (CLI-first testing + rapid tooling like uv).

## Architecture (Hybrid)
- **Ingestion/Control (Python/FastAPI)**: orchestrate runs, collect artifacts (tests, coverage, churn, deps), expose JSON/SSE/Prometheus endpoints.
- **Frontend (React/Vite/TS)**: consume contracts, render dashboards (coverage heatmap, dep graph, spec alignment, run timeline, docs viewer with Mermaid).
- **Storage**: SQLite/Parquet for run snapshots and metrics; local-first. Pluggable Postgres later.
- **Contracts**: versioned API schemas (OpenAPI + JSON Schemas) for /runs, /metrics, /coverage, /deps, /docs, /spec-map. UI treats backend as a dependency; no coupling to internal models.

## Key Capabilities
- **Metrics-first dashboard**: KPIs + trends (coverage %, failing tests, churn, coupling, dependency health, flake rate).
- **Runs timeline**: per-iteration prompt, exit code, git delta, tests, artifacts; live via SSE.
- **Docs/spec hub**: render steering/spec/tech docs with Mermaid; search and deep-link; show related code/tasks.
- **Coverage view**: LCOV -> tree heatmap; diff coverage per commit; filter by namespace.
- **Dependency graph**: madge JSON → interactive DAG; edge weights (imports), node risk (instability × churn); export Mermaid.
- **Spec alignment**: map spec/tasks to symbols/commits; status chips (done/in-progress/pending).
- **Test lab**: trigger targeted test suites; show durations, flake tracking, recent failures.

## Productivity & Tooling
- **CLI testing interface (textbook-level productivity)**:
  - `steer-run test :scope` shortcuts (e.g., `unit`, `web`, `cli`, `changed`).
  - Cached runs; report summary + flake detection.
  - Generate coverage JSON/LCOV per run for the dashboard.
- **Speed tools**:
  - Python deps via `uv` (fast resolver/installer).
  - JS deps via `pnpm` (already in use) and Vite for rapid reload.
  - Use `ruff`/`mypy` for Python; `eslint`/`tsc` for TS; optional `just` or `task` for scripts.
  - Parallelizable ingestion; avoid heavyweight frameworks.
- **Verification**:
  - Enforce contract tests: backend OpenAPI/JSON Schema validation; frontend typegen from schemas.
  - Snapshot JSON fixtures for runs/metrics to guard against shape drift.
  - CI lane: `steer-run ingest` (collect artifacts) → contract tests → UI typegen → UI tests.

## Contract-Driven Interfaces
- **Endpoints (versioned)**:
  - `/api/v1/runs` (list), `/api/v1/runs/:id` (details + artifacts), SSE `/api/v1/runs/live`.
  - `/api/v1/metrics/:runId` (coverage/churn/coupling), `/api/v1/deps/:runId`, `/api/v1/docs`, `/api/v1/spec-map`.
  - `/metrics` (Prometheus) for ops/Grafana.
- **Schemas**: JSON Schemas for RunSummary, RunArtifact (tests, coverage, git), CoverageTree, DepGraph, SpecMap, DocNode. Versioned and checked in.
- **Frontend integration**: generate TS types from schemas; reject incompatible backend via contract tests.

## Data Flow (per run)
1) Runner executes iteration; captures prompt, exit code, git before/after.
2) Tests run → results + coverage (LCOV) emitted.
3) Dependency graph via `madge` (or similar) → JSON.
4) Churn via `git` stats; optional complexity metrics.
5) FastAPI stores snapshot (SQLite/Parquet), exposes via endpoints + Prometheus counters.
6) UI subscribes to SSE during run; dashboards update live.

## Observability
- Prometheus metrics for runs (counts, durations, failures), tests, coverage, churn buckets.
- Optional logs to Loki/ELK; keep structured JSON logs.
- Grafana dashboards for ops; in-app dashboards for developer-facing visuals.

## Incremental Delivery Plan
1) **Contracts & emitters**: define v1 schemas; emit run JSON + coverage + deps into `.spec-workflow/monitor/`.
2) **FastAPI surface**: serve `/runs`, `/metrics`, `/coverage`, `/deps`, `/docs`, `/spec-map` from stored artifacts; add SSE + Prometheus.
3) **UI scaffold**: React/Vite app with dashboard + run timeline + docs viewer (Mermaid).
4) **Visualization**: coverage heatmap, dep graph, spec alignment matrix; test lab view.
5) **Productivity**: CLI `steer-run test :scope`, uv integration for Python deps, cached runs.
6) **Hardening**: contract tests, typegen, CI lane, flake tracking, alerts on coverage/flake thresholds.
