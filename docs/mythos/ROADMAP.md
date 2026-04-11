# MYTHOS — Development Roadmap

**Version**: 1.0
**Date**: 2026-04-04
**Status**: Active
**Author**: Architect

---

## Methodology

MYTHOS follows a **Kanban + BDD-ML + TDD** methodology, selected to match the research-heavy, experiment-driven nature of building an AI-native trading platform. Instead of fixed-duration sprints, the macro structure uses **PRD phases as milestones** — each phase represents a meaningful capability increment (Ingest, Perception, Synthesis, Execution) with explicit go/no-go criteria that must be satisfied before the next phase begins. This eliminates the artificial pressure of sprint deadlines on ML research while maintaining clear delivery accountability.

**Kanban WIP limits** are enforced to prevent context-switching, which is particularly destructive during ML experimentation: **max 1 active ML experiment** and **max 2 active engineering tasks per engineer** at any time. A **weekly async review** replaces the daily standup — each engineer posts a written update covering completed work, blockers, and next priorities. Blockers are escalated to the Architect within 24 hours; they do not age silently.

**Layer-specific test strategies** reflect the different verification needs across the stack:
- **Execution layer + safety gates**: Strict TDD — write the test before the code. These are deterministic systems where correctness is binary and lives are (financially) at stake.
- **Python FastAPI sidecar**: TDD for API contracts and data validation. Every endpoint has a contract test before implementation.
- **Data pipeline**: TDD + property-based testing using Hypothesis for Python. Property tests verify invariants (e.g., every CAMEO code maps to exactly one sector) that unit tests might miss.
- **ML models**: Backtest-Driven Development (BDD-ML) — define Sharpe/accuracy criteria before training. The backtest IS the test. A model that passes training loss targets but fails backtest criteria is a failed model.
- **TTA cycle**: Regression tests on daily adaptation delta. TTA must not degrade base model accuracy by more than 1% on the held-out benchmark.

---

## Phase Overview Table

| Phase | Focus | Duration | Go/No-Go Criteria |
|---|---|---|---|
| Phase 1 | Foundation: Ingest Layer + infrastructure | 6-8 weeks | GDELT pipeline live, FinBERT sentiment validated on historical data, all unit tests passing |
| Phase 2 | Perception Layer: Bi-LSTM + FastAPI sidecar | 8-10 weeks | >58% directional accuracy on hold-out set, API latency <200ms p99 |
| Phase 3 | Synthesis + Paper Trading | 10-12 weeks | Sharpe >1.5 AND max drawdown <8% over 3 months paper trading, CEO approval |
| Phase 4 | Live Trading: IBKR integration + monitoring | Ongoing | All 6 safety gates passing, individual IBKR account live, Irish regulatory compliance verified |

---

## Phase 1 — Kanban Board

### Board Columns

- **Backlog** — defined, not started
- **In Progress** — actively being worked (WIP limit: 2 engineering / 1 ML experiment)
- **In Review** — PR open or backtest running
- **Blocked** — impediment logged, escalated immediately
- **Done** — merged + criteria verified

---

### Epic 1: Infrastructure & DevOps (P1-INFRA)

| Ticket | Tag | Description |
|---|---|---|
| **P1-INFRA-001** | `[TDD]` | **Monorepo app scaffold for MYTHOS** — `apps/mythos/` with Python FastAPI sidecar (`apps/mythos/sidecar/`) and Node.js execution engine (`apps/mythos/engine/`). Directory structure, dependency files, linting config, CI pipeline. |
| **P1-INFRA-002** | `[TDD]` | **Docker Compose dev environment** — MYTHOS sidecar + engine + TimescaleDB + Redis (for signal queue). Health checks for all services. `docker compose up` brings full local stack. |
| **P1-INFRA-003** | `[TDD]` | **TimescaleDB schema v1** — tables: `sentiment_scores`, `market_bars`, `model_signals`, `trade_audit_log`. Migrations using Drizzle or Alembic. Retention policy: 7 years (MiFID II). |
| **P1-INFRA-004** | `[TDD]` | **CI/CD pipeline** — GitHub Actions: lint, type-check, unit tests, build on every PR. Block merge on red. Coverage threshold: 80% for execution engine, 70% for sidecar. |
| **P1-INFRA-005** | — | **Environment config** — `.env.example` with all required vars: `IBKR_*`, `OPENAI_API_KEY`, `FINBERT_MODEL_PATH`, `TIMESCALE_URL`, `FRED_API_KEY`. Secrets documented in `docs/mythos/SETUP.md`. |

---

### Epic 2: Data Pipeline — GDELT + FRED (P1-DATA)

| Ticket | Tag | Description |
|---|---|---|
| **P1-DATA-001** | `[TDD]` | **GDELT ingestion service (Python)** — daily batch fetch of GDELT GKG (Global Knowledge Graph) files. Filter by relevance score >70. Normalize to internal `RawEvent` schema. Unit tests: malformed data, network errors, duplicate deduplication. |
| **P1-DATA-002** | `[TDD + Property-based]` | **CAMEO actor to sector mapping** — map GDELT CAMEO actor codes to 11 GICS sectors. Property-based tests (Hypothesis): all CAMEO codes map to exactly one sector, no unmapped codes cause failures. Handle unknown codes gracefully (maps to `UNKNOWN` sector, not crash). |
| **P1-DATA-003** | `[TDD]` | **FRED economic data pipeline** — weekly fetch of key macro indicators (Fed Funds Rate, CPI, unemployment, yield curve). Normalize to `MacroSnapshot` schema. Tests: stale data handling, API rate limiting, missing fields. |
| **P1-DATA-004** | `[TDD]` | **Sector sentiment aggregator** — aggregate GDELT events by sector, compute daily sentiment vector `[-1, +1]` per sector. Unit tests: empty events, single event, conflicting sentiment events. |
| **P1-DATA-005** | `[TDD]` | **Data pipeline scheduler** — cron-based orchestration: GDELT at 06:00 UTC daily, FRED weekly Sunday 08:00 UTC. Dead-letter queue for failed fetches. Alert if pipeline hasn't run in 25h. |

---

### Epic 3: Ingest Layer — PLTA-FinBERT TTA (P1-NLP)

| Ticket | Tag | Description |
|---|---|---|
| **P1-NLP-001** | `[BDD-ML]` | **FinBERT baseline integration** — integrate `yiyanghkust/finbert-tone` via HuggingFace Transformers. FastAPI endpoint `POST /sentiment` accepting `{text: string, context: MacroSnapshot}`. BDD-ML criteria (must pass before P1-NLP-002): >72% accuracy on Financial PhraseBank test set. Unit tests: empty text, non-English text, API error handling. |
| **P1-NLP-002** | `[BDD-ML]` | **PLTA-TTA layer implementation** — implement Test-Time Adaptation on top of finbert-tone per MDPI 2025 paper methodology. Components: entropy regularisation, pseudo-label generation, discriminative fine-tuning with layer-wise LR decay. ~300-400 lines production Python. BDD-ML criteria: TTA-adapted model must show >3% improvement on regime-shift test set vs. baseline. Regression test: TTA must not degrade base accuracy by >1%. |
| **P1-NLP-003** | `[TDD]` | **Daily TTA adaptation cycle** — automated daily adaptation job: fetch last 24h of GDELT-sourced text, run TTA cycle, checkpoint adapted model weights, log adaptation delta. Tests: empty training batch, model checkpoint versioning, rollback on failed adaptation. |
| **P1-NLP-004** | `[TDD]` | **Regime-aware sentiment output** — compute `RegimeSentiment` struct: `{sector: string, score: float, confidence: float, regimeLabel: 'bull' | 'bear' | 'neutral' | 'volatile', adaptedAt: ISO8601}`. Tests: score boundary conditions, confidence calibration. |
| **P1-NLP-005** | `[TDD]` | **Sentiment API** — production FastAPI service with auth middleware, rate limiting, structured logging, and `GET /health` endpoint. Load test: must handle 100 req/s sustained. Integration test: full GDELT to sector aggregation to TTA sentiment to `RegimeSentiment` output pipeline. |

---

### Epic 4: Phase 1 Validation (P1-VALIDATE)

| Ticket | Tag | Description |
|---|---|---|
| **P1-VALIDATE-001** | `[BDD-ML]` | **Historical sentiment backtest** — run PLTA-FinBERT pipeline on 12 months of historical GDELT data (2024-2025). Compare sector sentiment signals vs. SPY sector ETF returns. Acceptance: sentiment directional accuracy >58% on 5-day forward return. Document results in `docs/mythos/backtests/phase1-sentiment-validation.md`. |
| **P1-VALIDATE-002** | — | **Phase 1 go/no-go review** — CEO + Architect review: all P1 epics done, CI green, backtest criteria met. Sign-off required before Phase 2 begins. |

---

### Epic 5: Documentation (P1-DOCS)

| Ticket | Tag | Description |
|---|---|---|
| **P1-DOCS-001** | — | **SETUP.md** — local dev setup guide (Docker, Python env, secrets, first run). |
| **P1-DOCS-002** | — | **ARCHITECTURE.md** — 4-layer diagram (Mermaid), data flow, technology decisions. |
| **P1-DOCS-003** | — | **CONTRIBUTING.md** — MYTHOS-specific contribution guide: TDD mandate, BDD-ML protocol, backtest requirements for model changes, PR checklist. |

---

## Phase 2 Preview (Perception Layer)

Phase 2 builds the Perception Layer: a Bi-LSTM neural network that processes real-time OHLCV price bars (1-minute and 5-minute) concatenated with the regime-aware sentiment score from the Ingest Layer. The model outputs a probability score (0.0 to 1.0) representing the likelihood that the current price sequence will continue its trajectory over the next 15-30 minutes.

Key deliverables include the Bi-LSTM model training pipeline, a FastAPI inference endpoint serving predictions with <100ms latency, and walk-forward validation infrastructure with regime-stratified holdout sets. The sidecar will expose a `POST /predict` endpoint returning the p-score alongside model confidence metadata.

**Go/no-go criteria**: >58% directional accuracy on hold-out set, API latency <200ms at p99, and Sharpe >1.5 on backtested signals. The full Phase 2 Kanban board will be defined after the Phase 1 go/no-go review is signed off.

---

## Phase 3 Preview (Synthesis + Paper Trading)

Phase 3 introduces the Synthesis Layer powered by FinMA-7B, a financially-tuned LLM that receives sentiment context, the Bi-LSTM probability score, and current portfolio state to perform chain-of-thought reasoning on trade theses. The output is a structured `LOGIC_PASS` or `LOGIC_FAIL` with a human-readable reasoning string.

This phase also includes 3 months of paper trading on the full 4-layer pipeline (Ingest + Perception + Synthesis + Execution with simulated orders). Paper trading validates end-to-end system behavior under real market conditions without capital risk.

**Go/no-go criteria**: Sharpe >1.5 AND max drawdown <8% over 3 months of paper trading, plus explicit CEO approval before any live capital deployment. The full Phase 3 Kanban board will be defined after the Phase 2 go/no-go review is signed off.

---

## Phase 4 Preview (Live Trading)

Phase 4 transitions MYTHOS to live trading through the IBKR Gateway, connecting to an individual IBKR account for order routing. All 6 deterministic safety gates (position size, drawdown limit, volatility gate, correlation cap, regime check, time-of-day) must be fully operational and verified.

Key concerns include Irish and EU regulatory compliance (MiFID II reporting, data retention), automatic kill switch implementation (flatten all positions if disconnected >60 seconds), and production monitoring with alerting. The system operates as a single-operator platform on the operator's own IBKR account — MYTHOS does not custody funds or act as a brokerage.

**Go/no-go criteria**: All 6 safety gates passing, individual IBKR account live and connected, Irish regulatory compliance verified by legal review, and CEO final sign-off. Phase 4 is ongoing — once live, continuous monitoring, model retraining, and multi-asset expansion begin.

---

## Definition of Done (global, all phases)

- Code reviewed and approved by at least 1 reviewer
- All tests passing (unit + integration + property-based where applicable)
- BDD-ML criteria met for any ML component
- Backtest results documented in `docs/mythos/backtests/`
- No open HIGH severity issues
- `CHANGELOG.md` entry added
- CEO sign-off for go/no-go gates

---

## Kanban WIP Policy

- **ML experiments**: max 1 active at a time (context-switch kills research quality)
- **Engineering tasks**: max 2 active per engineer
- **Blocked items**: escalated to Architect within 24h, no silent aging
- **Phase gate**: no Phase N+1 ticket enters In Progress until Phase N go/no-go is signed off
