# MYTHOS Product Brief

## 1. Executive Summary

MYTHOS is an AI-native quantitative trading platform that fuses real-time NLP sentiment analysis, temporal sequence prediction, and large-language-model reasoning into a unified four-layer architecture (Ingest, Perception, Synthesis, Execution) to generate and execute equity trade signals. It inherits the deterministic safety-gate philosophy proven in the NEO Sovereign Trading Terminal while replacing NEO's static similarity-based intelligence with causal-predictive models (finbert-tone + in-house PLTA-TTA, Bi-LSTM, FinMA). The PLTA methodology (MDPI 2025, peer-reviewed) is implemented in-house on top of `yiyanghkust/finbert-tone` (HuggingFace, 905k downloads, production-grade) rather than using the reference research repo directly. The result is a system that does not merely react to price patterns but reasons about market context, forecasts momentum trajectories, and validates every trade thesis before capital is deployed.

---

## 2. Problem Statement

### What is broken in current trading platforms

**Retail platforms** (Robinhood, Webull) offer order execution but zero algorithmic intelligence. They treat every user as a discretionary click-trader.

**Semi-automated retail** (IBKR TWS, ThinkorSwim) provide technical indicators and basic conditional orders but no machine-learning pipeline, no sentiment integration, and no adaptive risk management.

**Quant-as-a-service platforms** (QuantConnect, Alpaca) give users a backtesting sandbox and an API, but the user must build the entire intelligence stack from scratch. There is no pre-integrated perception or reasoning layer.

**Institutional systems** (Two Sigma, DE Shaw, Citadel) have solved this problem internally with billion-dollar infrastructure, but their architectures are proprietary, cloud-bound, and inaccessible to independent quants and small prop desks.

### Why NEO reached its ceiling

NEO is a sophisticated reactive system. Its intelligence layer (V15) uses KNN similarity search over 128-dimensional event embeddings (Xenova/all-mpnet-base-v2, not FinBERT) stored in a local vector database. This approach has three structural limitations:

1. **Static embeddings**: The sentence-transformer model is frozen after training. It cannot adapt to semantic drift -- the phenomenon where identical headlines ("Fed cuts rates") carry opposite market implications in different macro regimes.
2. **Snapshot-based pattern matching**: KNN compares the current signal vector against historical vectors as isolated points. It has no concept of sequence, momentum trajectory, or the "physics" of how price arrived at its current level.
3. **No reasoning layer**: NEO's governance gates (EV38) are purely numeric thresholds. The system cannot ask "Does this trade make macro-economic sense?" -- it can only ask "Does this trade violate a hard limit?"

These limitations produce a system with a well-defined alpha ceiling: it can filter bad trades effectively but cannot generate predictive alpha from causal understanding.

### The market gap

There is no commercially available platform that combines:
- Temporal-aware NLP sentiment (not just "positive/negative" but "positive-in-this-regime")
- Sequence-based momentum prediction (not just "RSI is 30" but "the velocity of this decline is accelerating")
- LLM-powered trade thesis validation (not just "position size OK" but "this trade is logically consistent with macro conditions")
- Deterministic safety gates that cannot be overridden by AI confidence

MYTHOS fills this gap.

---

## 3. Vision & Mission

**Vision**: Sovereign AI trading intelligence -- institutional-grade layered prediction and reasoning, running locally, with full auditability and zero cloud dependency during live execution.

**Mission**: Build the first production-grade trading platform that chains NLP perception, temporal prediction, and generative reasoning into a single deterministic-safe execution pipeline accessible to sophisticated independent traders and small funds.

**What winning looks like in 3 years**:
- Live trading with verifiable Sharpe ratio above 1.5 across multiple equity strategies
- Sub-500ms end-to-end signal-to-order latency
- Daily adaptive model calibration (TTA) with no manual intervention
- A reproducible, auditable decision trail for every trade executed
- Expansion from US equities to futures and FX with the same layered architecture

---

## 4. What MYTHOS Is (Not)

| MYTHOS **is** | MYTHOS **is not** |
|---|---|
| A multi-layer AI trading system that chains perception, prediction, reasoning, and execution | A black-box that outputs "buy/sell" without explanation |
| A local-first platform where all inference runs on the operator's hardware | A cloud SaaS product that sends trade data to third-party servers |
| A system that uses LLMs for pre-trade reasoning and post-trade analysis | A system that places LLM output directly on the execution hot path without deterministic gates |
| A medium-frequency system (1-minute to daily bars) for equities | A high-frequency trading (HFT) system competing on microsecond latency |
| A tool for technically sophisticated quants who want AI-augmented decision-making | A retail app for casual investors |
| An execution platform that connects to IBKR for order routing | A brokerage or custodian of client funds |
| A research-grade system with full backtesting and learning loops | A "set and forget" trading bot |

---

## 5. Four-Layer Architecture Overview

MYTHOS processes market intelligence through four sequential layers. Each layer enriches the signal; no layer can bypass the safety gates in the Execution layer.

```
                         MYTHOS 4-Layer Architecture
  ============================================================================

  LAYER 1: INGEST                    LAYER 2: PERCEPTION
  -------------------------          -------------------------
  | GDELT v2 Events      |          | Bi-LSTM Model         |
  | FRED Macro Series     |  -----> | (FastAPI Sidecar)     |
  | (GDP, CPI, VIX, YC)  |          |                       |
  |                       |          | Input:                |
  | PLTA-FinBERT          |          |   OHLCV bars (1m/5m) |
  | (Daily TTA Update)    |          |   + Sentiment Score   |
  |                       |          |                       |
  | Output:               |          | Output:               |
  |   Regime-Aware        |          |   Probability Score   |
  |   Sentiment Vector    |          |   (0.0 - 1.0)        |
  -------------------------          -------------------------
           |                                   |
           |          +------------------------+
           |          |
           v          v
  LAYER 3: SYNTHESIS                 LAYER 4: EXECUTION
  -------------------------          -------------------------
  | FinMA LLM             |          | 6-Gate Safety Chain   |
  | (Macro Reasoning)     |          |   1. Position Size    |
  |                       |          |   2. Drawdown Limit   |
  | Input:                |  -----> |   3. Volatility Gate  |
  |   Sentiment + P-Score |          |   4. Correlation Cap  |
  |   + Portfolio State   |          |   5. Regime Check     |
  |                       |          |   6. Time-of-Day      |
  | Output:               |          |                       |
  |   LOGIC_PASS / FAIL   |          | IBKR Gateway          |
  |   + Reasoning String  |          | (Order Routing)       |
  -------------------------          -------------------------
```

**Layer 1 -- Ingest**: Consumes global event data (GDELT v2) and macroeconomic indicators (FRED API). The finbert-tone base model with in-house PLTA-TTA layer processes this into a regime-aware sentiment score that adapts daily via Test-Time Adaptation. The PLTA methodology (MDPI 2025 paper) is implemented in-house (~300-400 lines production Python) on top of the battle-tested `yiyanghkust/finbert-tone` model. This layer answers: "What is the world telling us right now, calibrated to today's market regime?"

**Layer 2 -- Perception**: A Bi-LSTM neural network processes real-time OHLCV price bars (1-minute and 5-minute) concatenated with the sentiment score from Layer 1. It outputs a probability score (0.0 to 1.0) representing the likelihood that the current price sequence will continue its trajectory over the next 15-30 minutes. This layer answers: "What is the momentum physics of this price move?"

**Layer 3 -- Synthesis**: FinMA (a financially-tuned LLM) receives the sentiment context, the probability score, and the current portfolio state. It performs chain-of-thought reasoning to validate or reject the trade thesis. Output is a structured LOGIC_PASS or LOGIC_FAIL with a human-readable reasoning string. This layer answers: "Does this trade make logical sense given everything we know?"

**Layer 4 -- Execution**: A deterministic 6-gate safety chain inherited from NEO's proven risk architecture. Every gate is a hard pass/fail with no AI override capability. Only after all gates pass does the order reach the IBKR Gateway for routing. This layer answers: "Is this trade within our risk envelope regardless of what the AI thinks?"

---

## 6. Key Differentiators

### vs. Retail Platforms (IBKR, Robinhood, Webull)

| Dimension | Retail | MYTHOS |
|---|---|---|
| Intelligence | Technical indicators (lagging) | 3-model AI stack (leading + lagging) |
| Sentiment | None | finbert-tone + in-house PLTA-TTA with daily adaptation |
| Risk management | Stop-loss orders | 6-gate deterministic chain + circuit breakers |
| Adaptability | Manual parameter tuning | Automated model adaptation to regime shifts |

### vs. Quant Platforms (QuantConnect, Alpaca, Zipline)

| Dimension | Quant Platforms | MYTHOS |
|---|---|---|
| ML integration | BYO -- user builds from scratch | Pre-integrated 4-layer AI pipeline |
| Reasoning | None | FinMA synthesis with chain-of-thought |
| Safety | Basic position limits | Auditable 6-gate chain + LLM logic validation |
| Deployment | Cloud-hosted execution | Local-first, sovereign |

### vs. Institutional (Two Sigma, DE Shaw, Citadel)

| Dimension | Institutional | MYTHOS |
|---|---|---|
| Architecture | Similar layered AI | Similar layered AI |
| Cost | $100M+ infrastructure | Single VPS + local GPU |
| Accessibility | PhD quant teams only | Accessible to skilled independent traders |
| Transparency | Proprietary black box | Fully auditable decision trail |
| Frequency | Microsecond HFT | Medium-frequency (seconds to minutes) |

---

## 7. Target User

### Primary Persona: The Independent Quant

- **Profile**: Technically sophisticated retail trader or ex-institutional quant running a personal book. Comfortable with Python, understands ML concepts, has $50K-$500K in trading capital.
- **Current pain**: Spends 60% of time building and maintaining data pipelines and model infrastructure instead of researching alpha. Uses QuantConnect or custom scripts but lacks an integrated perception-reasoning-execution pipeline.
- **What they care about**: Sharpe ratio, drawdown control, auditability, independence from cloud vendors, ability to customize models.

### Secondary Persona: The Small Prop Desk

- **Profile**: 2-5 person prop trading operation. $1M-$10M AUM. Currently uses a patchwork of IBKR API scripts, spreadsheet-based risk tracking, and manual sentiment monitoring.
- **Current pain**: Cannot afford institutional infrastructure but needs institutional-grade risk management and signal generation.
- **What they care about**: Operational reliability, regulatory compliance, multi-strategy support, clear P&L attribution.

---

## 8. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Signal accuracy** (Bi-LSTM p-score calibration) | Brier score < 0.20 on 15-min forward returns | Rolling 30-day evaluation |
| **Sharpe ratio** (live trading, annualized) | > 1.5 after 6 months live | Monthly calculation |
| **Maximum drawdown** | < 10% of portfolio at any point | Real-time monitoring |
| **Daily loss limit** | < 2% of portfolio | Hard circuit breaker |
| **End-to-end latency** (bar close to order submission) | < 500ms (p95) | Instrumented per-trade |
| **Bi-LSTM inference latency** | < 100ms on 1-minute bars | FastAPI sidecar metrics |
| **System uptime** (during market hours) | 99.9% (< 23 min downtime/month) | Health check monitoring |
| **Gate audit completeness** | 100% of trades have full 6-gate audit log | Nightly integrity check |
| **PLTA-TTA cycle** (finbert-tone base) | Completes daily before market open | Automated schedule |
| **FinMA synthesis latency** | < 2 seconds per trade evaluation | Pre-trade, not on hot path |

---

## 9. Evolution from NEO

### What NEO built (and built well)

NEO is a locally-sovereign Electron/Node.js trading terminal with:
- GDELT v2 event ingestion pipeline processing 100K-160K events/day
- FRED macroeconomic data integration
- 768-dim sentence embeddings (Xenova/all-mpnet-base-v2) PCA-compressed to 128-dim, stored in vec0
- KNN similarity search (V15) for signal pattern memory, symbol clustering, and regime similarity
- 4-strategy scoring engine with 32+ sequential deterministic gates
- 6-gate risk governance chain (budget, position limits, market gate, cooldown, compliance, governance)
- Cross-session empirical learning (24 fields per trade)
- Multi-timeframe analysis (1m, 5m, 15m, 60m, daily)

### Where NEO hit its ceiling

1. **Static embeddings cannot adapt**: all-mpnet-base-v2 produces the same vector for "Fed cuts rates" regardless of whether the market interprets cuts as bullish (2019) or bearish-panic (2026). NEO's intelligence is frozen at training time.
2. **KNN is a lookup, not a predictor**: Finding historically similar signal vectors tells you what happened in similar situations. It cannot model the non-linear dynamics of how the current price sequence is evolving. A "falling knife" and a "bottom reversal" can look identical as static snapshots but have opposite momentum trajectories.
3. **No causal reasoning**: NEO's governance gates are numeric thresholds. The system cannot evaluate whether a long-tech trade makes sense when FRED data shows rising yields compressing P/E ratios. It can only check if position size and drawdown limits are within bounds.
4. **Node.js-only constraint**: By refusing a Python sidecar, NEO cut itself off from the entire ecosystem of production ML tooling (PyTorch, HuggingFace, scikit-learn), limiting future model upgrades.

### What MYTHOS adds

| Capability | NEO | MYTHOS |
|---|---|---|
| Sentiment | Static 128-dim embeddings | Regime-aware finbert-tone + in-house PLTA-TTA with daily adaptation |
| Prediction | KNN snapshot lookup | Bi-LSTM sequence probability forecasting |
| Reasoning | Numeric threshold gates | FinMA chain-of-thought synthesis |
| Adaptability | Fixed model weights | Daily model adaptation to market regime |
| Tech stack | Node.js only | Node.js execution + Python FastAPI sidecar |
| Learning loop | Empirical outcome storage | Model weight updates from trade outcomes |

---

## 10. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Bi-LSTM overfitting** to training data regime | High | Medium | Walk-forward validation with regime-stratified holdout sets; automatic performance decay detection triggers retraining |
| **PLTA-TTA drift** -- daily adaptation drifts finbert-tone away from base performance | Medium | Medium | Anchor regularization: TTA updates are bounded to max 5% weight delta from base finbert-tone model per day; weekly full evaluation against held-out benchmark |
| **FinMA hallucination** -- LLM produces plausible but incorrect reasoning | High | Medium | FinMA is advisory only; LOGIC_PASS/FAIL is validated against structured rules before reaching execution; deterministic gates cannot be bypassed |
| **GDELT/FRED data latency** -- delayed or missing data feeds | Medium | Low | Graceful degradation: Perception layer operates on price data alone if sentiment is stale >4 hours; alert raised for operator |
| **IBKR Gateway disconnection** during trading hours | High | Low | Automatic reconnection with exponential backoff; kill switch flattens all positions if disconnected >60 seconds |
| **Infrastructure failure** (VPS crash, disk full) | High | Low | Docker health checks with auto-restart; daily database backups; position state persisted to disk on every change |
| **Regulatory risk** -- pattern day trader rules, wash sale violations | Medium | Medium | Compliance gate enforces PDT minimum equity; wash sale detector prevents re-entry within 30-day window on loss-closed positions |
| **Model serving latency spike** -- FastAPI sidecar slow under load | Medium | Low | Circuit breaker: if inference latency exceeds 500ms, system falls back to deterministic-only mode (no AI enrichment) |
| **Adversarial market conditions** -- flash crash, halt, gap | High | Low | Automatic circuit breaker on 3% portfolio drawdown in any 5-minute window; all positions reduced to 50% on market-wide volatility spike (VIX > 35) |
