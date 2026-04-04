# MYTHOS Product Requirements Document (PRD)

**Version**: 1.1
**Date**: 2026-04-04
**Status**: Draft — Architectural Decisions Resolved
**Author**: Architect

---

## 1. Overview & Goals

### 1.1 Product Goals (Measurable)

| ID | Goal | Metric | Target |
|----|------|--------|--------|
| G1 | Generate predictive alpha from sentiment + sequence models | Sharpe ratio (annualized, live) | > 1.5 after 6 months |
| G2 | Maintain capital preservation through deterministic safety | Maximum portfolio drawdown | < 10% at any point |
| G3 | Achieve low-latency signal-to-execution pipeline | End-to-end p95 latency | < 500ms |
| G4 | Adapt to market regime shifts without manual intervention | PLTA-FinBERT TTA completion | Daily before market open |
| G5 | Provide full auditability for every trade decision | Audit log completeness | 100% of trades |
| G6 | Operate with high reliability during market hours | System uptime (RTH) | 99.9% |

### 1.2 Non-Goals (Explicit)

- **Not HFT**: MYTHOS does not compete on microsecond latency. Sub-500ms is the target, not sub-microsecond.
- **Not multi-asset at launch**: Phases 1-3 target a single instrument (SPY or ES futures). Multi-asset expansion in Phase 4 only.
- **Not a brokerage**: MYTHOS routes orders through IBKR. It does not custody funds.
- **Not a social/copy-trading platform**: Single-operator system. No multi-tenant features.
- **Not cloud-dependent for execution**: All live trading inference runs locally. Cloud is used only for development, backtesting compute, and optional model training.
- **Not a replacement for human judgment**: The operator sets strategy parameters, approves model updates, and can override any automated decision.

### 1.3 Success Criteria

The system is considered successful when:
1. It completes 30 consecutive trading days on paper with Sharpe > 1.0 and max drawdown < 8%
2. All 4 layers (Ingest, Perception, Synthesis, Execution) operate end-to-end without manual intervention
3. Every trade has a complete audit trail: sentiment score, p-score, FinMA reasoning, 6-gate pass/fail record
4. The operator can reconstruct the full decision path for any historical trade within 30 seconds

---

## 2. User Stories

| ID | Persona | Story | Acceptance Criteria |
|----|---------|-------|-------------------|
| US1 | Quant Trader | As a quant trader, I want the system to ingest GDELT events and FRED macro data daily so that my trading signals incorporate real-world context | GDELT v2 events processed and sentiment scores available before 09:30 ET each trading day; FRED series updated within 1 hour of publication |
| US2 | Quant Trader | As a quant trader, I want the Bi-LSTM to output a probability score for each symbol on each bar so that I can assess momentum quality before entering a trade | P-score (0.0-1.0) returned within 100ms of bar close for every monitored symbol |
| US3 | Quant Trader | As a quant trader, I want FinMA to validate each trade thesis against macro conditions so that I avoid trades that are technically valid but fundamentally flawed | Every trade signal receives a LOGIC_PASS or LOGIC_FAIL with a human-readable reasoning string before reaching execution |
| US4 | Quant Trader | As a quant trader, I want a deterministic 6-gate safety chain so that no AI confidence score can override hard risk limits | All 6 gates evaluated for every trade; any single FAIL blocks execution; gate results logged immutably |
| US5 | Quant Trader | As a quant trader, I want to backtest strategies across historical data with the full 4-layer pipeline so that I can validate model performance before risking capital | Backtesting engine replays historical bars through all 4 layers with identical logic to live mode; results include per-trade P&L, Sharpe, drawdown |
| US6 | Quant Trader | As a quant trader, I want an automatic kill switch that flattens all positions when circuit breaker conditions are met so that I am protected from catastrophic loss | Kill switch activates within 1 second of trigger condition; all open positions closed via market orders; system enters safe mode |
| US7 | Quant Trader | As a quant trader, I want a real-time dashboard showing P&L, active positions, gate status, model confidence, and system health so that I can monitor operations at a glance | Dashboard updates within 2 seconds of any state change; all metrics visible on a single screen |
| US8 | Quant Trader | As a quant trader, I want the system to log every trade outcome and feed it back into model evaluation so that model performance is continuously monitored and degradation is detected | Trade outcomes stored within 1 minute of position close; weekly model evaluation report generated automatically |
| US9 | Prop Desk Manager | As a prop desk manager, I want per-strategy P&L attribution so that I can identify which strategies are generating alpha and which are degrading | P&L broken down by strategy, symbol, and time period; available in dashboard and exportable as CSV |
| US10 | Quant Trader | As a quant trader, I want the system to gracefully degrade when a layer is unavailable so that I never miss a trading opportunity due to a non-critical component failure | If PLTA-FinBERT or FinMA is unavailable, system operates in "deterministic-only" mode using price data and safety gates; operator is alerted |

---

## 3. Functional Requirements

### 3.1 Ingest Layer

#### 3.1.1 GDELT v2 Data Pipeline

**Data Source**: `http://data.gdeltproject.org/events/YYYYMMDD.export.CSV.zip`

**Fetch Frequency**: Daily at 05:00 ET (pre-market). Intraday update at 12:00 ET for mid-day regime shift detection.

**Fields Required** (per event):

| Field | Column | Description |
|-------|--------|-------------|
| `event_id` | 0 | Unique GDELT event identifier |
| `event_date` | 1 | YYYYMMDD format |
| `actor1_name` | 5 | Primary actor name |
| `actor1_country` | 7 | Primary actor country code |
| `actor2_name` | 15 | Secondary actor name |
| `actor2_country` | 17 | Secondary actor country code |
| `event_code` | 26 | CAMEO event code |
| `event_base_code` | 27 | CAMEO base code |
| `quad_class` | 28 | Quadrant classification (1-4) |
| `goldstein_scale` | 30 | Goldstein conflict-cooperation scale (-10 to +10) |
| `num_mentions` | 31 | Number of source mentions |
| `num_sources` | 32 | Number of distinct sources |
| `num_articles` | 33 | Number of distinct articles |
| `avg_tone` | 34 | Average tone of source documents (-100 to +100) |
| `source_url` | 57 | Source document URL |

**Preprocessing Steps**:
1. Decompress PKZip archive in memory
2. Parse tab-delimited rows; discard rows with < 58 columns
3. Filter to events relevant to monitored instruments (country codes, actor names matching watchlist)
4. Deduplicate by `event_id`
5. Phase 1-2: CAMEO actor codes mapped to sector buckets; aggregate sentiment per sector. NER-to-ticker mapping deferred to Phase 3.
6. Compute daily aggregate metrics per sector/instrument: event count, mean Goldstein scale, mean avg_tone, max quad_class
7. Store raw events in `gdelt_raw` table; store aggregates in `gdelt_daily` table

**Storage Schema** (`gdelt_raw`):
```sql
CREATE TABLE gdelt_raw (
    event_id        BIGINT PRIMARY KEY,
    event_date      DATE NOT NULL,
    actor1_name     TEXT,
    actor1_country  CHAR(3),
    actor2_name     TEXT,
    actor2_country  CHAR(3),
    event_code      VARCHAR(10),
    quad_class      SMALLINT,
    goldstein_scale FLOAT,
    num_mentions    INT,
    num_sources     INT,
    num_articles    INT,
    avg_tone        FLOAT,
    source_url      TEXT,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gdelt_raw_date ON gdelt_raw(event_date);
```

**Storage Schema** (`gdelt_daily`):
```sql
CREATE TABLE gdelt_daily (
    symbol          VARCHAR(10) NOT NULL,
    trade_date      DATE NOT NULL,
    event_count     INT,
    mean_goldstein  FLOAT,
    mean_tone       FLOAT,
    max_quad_class  SMALLINT,
    sentiment_score FLOAT,          -- PLTA-FinBERT output
    regime_class    VARCHAR(20),    -- bull / bear / volatile / neutral
    computed_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (symbol, trade_date)
);
```

#### 3.1.2 FRED API Integration

**API Endpoint**: `https://api.stlouisfed.org/fred/series/observations`

**Series Required**:

| Series ID | Name | Update Cadence | Use |
|-----------|------|---------------|-----|
| `GDP` | Real GDP | Quarterly | Macro growth context |
| `CPIAUCSL` | CPI (All Urban Consumers) | Monthly | Inflation regime |
| `VIXCLS` | CBOE VIX | Daily | Volatility regime |
| `DGS10` | 10-Year Treasury Yield | Daily | Rate environment |
| `DGS2` | 2-Year Treasury Yield | Daily | Yield curve (DGS10-DGS2 spread) |
| `T10Y2Y` | 10Y-2Y Spread | Daily | Direct inversion signal |
| `UNRATE` | Unemployment Rate | Monthly | Labor market health |
| `FEDFUNDS` | Federal Funds Rate | Daily (changes ~8x/year) | Monetary policy stance |

**Fetch Schedule**: Daily at 04:30 ET. Check for updates; only download changed series.

**Storage Schema** (`fred_series`):
```sql
CREATE TABLE fred_series (
    series_id       VARCHAR(20) NOT NULL,
    observation_date DATE NOT NULL,
    value           FLOAT,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (series_id, observation_date)
);
CREATE INDEX idx_fred_date ON fred_series(observation_date);
```

#### 3.1.3 PLTA-FinBERT Processing

**Model**: Custom TTA implementation on base FinBERT (~200 lines PyTorch). No pre-built PLTA-FinBERT available as drop-in.

**Input Format**:
- Batch of text strings: GDELT event descriptions, headlines, and aggregated daily narrative
- Each input is a string of max 512 tokens

**Output Schema** (per symbol per day):
```json
{
    "symbol": "NVDA",
    "trade_date": "2026-04-04",
    "sentiment_score": 0.72,
    "sentiment_label": "positive",
    "confidence": 0.89,
    "regime_classification": "bull_momentum",
    "regime_confidence": 0.76,
    "tta_delta": 0.003,
    "computed_at": "2026-04-04T08:45:00Z"
}
```

**`regime_classification` values**: `bull_momentum`, `bull_rotation`, `bear_trend`, `bear_panic`, `volatile_range`, `neutral_consolidation`

**Daily TTA Process**:
1. At market close (16:15 ET), collect the day's GDELT events and corresponding price outcomes
2. Run multi-perturbation voting: pass each headline through 5 perturbed model copies (dropout-enabled)
3. Filter for high-agreement pseudo-labels (>80% vote consistency across perturbations)
4. Perform bounded gradient update: learning rate 1e-5, max weight delta 5% from base model per day
5. Validate adapted model against held-out benchmark (last 5 trading days); revert if accuracy drops >2%
6. Persist updated model weights for next trading day

**Fallback**: If TTA fails validation, use previous day's model weights. Alert operator.

#### 3.1.4 Data Storage Architecture

**Database**: PostgreSQL 16 with TimescaleDB extension for time-series optimization.

**Rationale**: TimescaleDB provides automatic partitioning (hypertables) for time-series data, compression for historical data (10x reduction), and continuous aggregates for real-time rollups. This eliminates the need for separate time-series and relational databases.

**Retention Policy**:
- Raw GDELT events: 90 days (then compressed archive)
- GDELT daily aggregates: Indefinite
- FRED series: Indefinite
- PLTA-FinBERT outputs: Indefinite
- Price bars (1m): 30 days hot, then compressed
- Price bars (5m+): Indefinite

---

### 3.2 Perception Layer

#### 3.2.1 Bi-LSTM Architecture

**Model Type**: Bidirectional Long Short-Term Memory (Bi-LSTM)

**Input Features** (per bar, per symbol):
| Feature | Source | Dimension |
|---------|--------|-----------|
| Open | IBKR bars | 1 |
| High | IBKR bars | 1 |
| Low | IBKR bars | 1 |
| Close | IBKR bars | 1 |
| Volume | IBKR bars | 1 |
| VWAP | IBKR bars | 1 |
| Sentiment Score | PLTA-FinBERT (Layer 1) | 1 |
| Regime Class | One-hot encoded (Layer 1) | 6 |
| VIX (latest) | FRED | 1 |
| Yield Spread | FRED (DGS10-DGS2) | 1 |

**Total input features per bar**: 15

**Sequence Configuration**:
| Parameter | Day Trading Mode | Swing Trading Mode |
|-----------|-----------------|-------------------|
| Primary bar size | 5-minute | 1-hour |
| Sequence length (lookback) | 60 bars (5 hours) | 48 bars (2 days) |
| Context bar size | 1-hour | Daily |
| Context sequence length | 12 bars (12 hours) | 20 bars (4 weeks) |

**Network Architecture**:
```
Input Layer:     [batch_size, seq_len, 15]
                         |
Bi-LSTM Layer 1: hidden_units=128, dropout=0.2
                         |
Bi-LSTM Layer 2: hidden_units=64, dropout=0.2
                         |
Attention Layer: Self-attention over sequence outputs
                         |
Dense Layer:     units=32, activation=ReLU
                         |
Output Layer:    units=1, activation=Sigmoid
                         |
Output:          p_score (0.0 - 1.0)
```

**Total parameters**: ~450K (lightweight enough for CPU inference)

#### 3.2.2 Training

**Training Data**: Walk-forward expanding window. Minimum 6 months of historical 5m bars (approx. 18,000 bars per symbol).

**Label Generation**: For each bar at time `t`, the label is:
- `1` if `close[t + forward_window] > close[t] * (1 + min_threshold)`
- `0` if `close[t + forward_window] < close[t] * (1 - min_threshold)`
- Excluded if price change is within `+/- min_threshold` (noise zone)

Where `forward_window` = 15 bars (75 minutes for 5m bars) and `min_threshold` = 0.3%.

**Training Cadence**: Weekly batch retrain (every Sunday) on rolling window. Online learning deferred — instability risk during drawdown. No daily fine-tuning in Phases 1-3.

**Validation**: Walk-forward cross-validation with 5 folds. Each fold uses the most recent 20% of data as test set. Model deployed only if Brier score < 0.22 on all folds.

#### 3.2.3 Inference

**Latency Budget**: < 100ms per symbol on 1-minute bars (CPU inference on 4-core VPS)

**Serving**: FastAPI sidecar (Python 3.11) with PyTorch model loaded in memory. Batch inference for all monitored symbols on each bar close.

**Endpoint**: `POST /inference/perception`

**Request Schema**:
```json
{
    "symbol": "NVDA",
    "bar_size": "5m",
    "bars": [
        {
            "timestamp": "2026-04-04T14:30:00Z",
            "open": 145.20,
            "high": 145.85,
            "low": 145.10,
            "close": 145.60,
            "volume": 12500,
            "vwap": 145.45
        }
    ],
    "sentiment_score": 0.72,
    "regime_class": "bull_momentum",
    "vix": 18.5,
    "yield_spread": 0.45
}
```

**Response Schema**:
```json
{
    "symbol": "NVDA",
    "bar_timestamp": "2026-04-04T14:30:00Z",
    "p_score": 0.78,
    "confidence_interval": [0.65, 0.88],
    "direction": "long",
    "sequence_entropy": 0.34,
    "inference_latency_ms": 23,
    "model_version": "bilstm-v1.3-20260330"
}
```

---

### 3.3 Synthesis Layer

#### 3.3.1 FinMA Integration

**Model**: FinMA-7B (financially-tuned LLM, LLaMA-based backbone), 4-bit quantized (~4GB VRAM) in GGUF format for local inference via llama.cpp. Upgrade path to FinMA-13B documented but deferred.

**Hardware Requirement**: 16GB RAM minimum. GPU optional but recommended (RTX 3060+ for sub-1s inference).

**Invocation**: FinMA is called **before** the order reaches the execution hot path. It is not in the latency-critical loop. Target latency: < 2 seconds.

#### 3.3.2 Prompt Engineering Spec

**System Prompt**:
```
You are a senior quantitative analyst at a systematic trading fund. Your role is to
evaluate trade signals against macroeconomic context and issue a LOGIC_PASS or
LOGIC_FAIL decision. You must be conservative: when in doubt, FAIL.

You will receive:
1. A trade signal (symbol, direction, probability score)
2. Current sentiment context (PLTA-FinBERT regime and score)
3. Macro indicators (VIX, yield curve, GDP trend, CPI trend)
4. Current portfolio state (open positions, daily P&L, exposure)

Respond ONLY in the following JSON format:
{
    "decision": "LOGIC_PASS" or "LOGIC_FAIL",
    "confidence": 0.0-1.0,
    "reasoning": "2-3 sentence explanation",
    "risk_flags": ["list", "of", "specific", "concerns"],
    "suggested_position_modifier": 0.5-1.0
}
```

**User Prompt Template**:
```
TRADE SIGNAL:
  Symbol: {symbol}
  Direction: {direction}
  Bi-LSTM P-Score: {p_score} (confidence: {confidence_interval})

SENTIMENT CONTEXT:
  PLTA-FinBERT Score: {sentiment_score} ({sentiment_label})
  Regime: {regime_classification} (confidence: {regime_confidence})

MACRO INDICATORS:
  VIX: {vix} (5-day trend: {vix_trend})
  10Y-2Y Spread: {yield_spread} (direction: {spread_direction})
  Fed Funds Rate: {fed_rate}
  Latest CPI: {cpi} (MoM change: {cpi_change})

PORTFOLIO STATE:
  Open Positions: {position_count}
  Net Exposure: {net_exposure}%
  Daily P&L: {daily_pnl}%
  Sector Exposure to {sector}: {sector_exposure}%

Evaluate this trade and respond in the required JSON format.
```

#### 3.3.3 LOGIC_PASS/FAIL Decision

**Input**: P-score from Perception + Sentiment context from Ingest + Portfolio state from Execution

**Output Schema**:
```json
{
    "trade_id": "MYTHOS-20260404-143000-NVDA-L",
    "decision": "LOGIC_PASS",
    "confidence": 0.82,
    "reasoning": "Bullish momentum signal (p=0.78) aligns with positive sector sentiment and accommodative macro regime. Yield spread widening supports risk-on positioning. Current sector exposure within limits.",
    "risk_flags": [],
    "suggested_position_modifier": 1.0,
    "finma_model_version": "finma-7b-q4-v2.1",
    "inference_latency_ms": 1450,
    "evaluated_at": "2026-04-04T14:30:02Z"
}
```

**Decision Thresholds**:
| Condition | Result |
|-----------|--------|
| P-score >= 0.65 AND FinMA = LOGIC_PASS | Proceed to execution gates |
| P-score >= 0.80 AND FinMA = LOGIC_FAIL with confidence < 0.60 | Proceed with reduced position (50%) |
| P-score < 0.65 | Reject regardless of FinMA |
| FinMA = LOGIC_FAIL with confidence >= 0.60 | Reject regardless of P-score |

#### 3.3.4 Fallback Behaviour (FinMA Unavailable)

If the FinMA sidecar is unreachable or inference exceeds 5 seconds:
1. Log the failure with timestamp and error
2. Alert operator via dashboard notification
3. Operate in **deterministic-only mode**: trades proceed to the 6-gate safety chain without FinMA validation, subject to stricter thresholds:
   - P-score minimum raised from 0.65 to 0.75
   - Position size capped at 50% of normal
4. Continue attempting FinMA reconnection every 60 seconds
5. Resume normal operation when FinMA responds successfully

---

### 3.4 Execution Layer

#### 3.4.1 IBKR Gateway Integration

**Connection**: IB Gateway API via TCP socket (port 4001 for live, 4002 for paper).

**Library**: `ib_insync` (Python) or `@stoqey/ib` (Node.js) for the execution engine.

**Connection Management**:
- Persistent connection with heartbeat every 30 seconds
- Automatic reconnection on disconnect: 3 attempts at 5s, 10s, 30s intervals
- If reconnection fails after 3 attempts: activate kill switch, alert operator
- Connection state tracked and displayed on dashboard

**Order Types Supported**:
| Order Type | Use Case |
|-----------|----------|
| Market | Kill switch position flattening |
| Limit | Standard entry and exit |
| Stop | Stop-loss protection |
| Stop-Limit | Controlled stop-loss (avoid slippage in fast markets) |
| Bracket | Entry + take-profit + stop-loss as atomic unit |

**Supported Instruments** (Phases 1-3): Single instrument — SPY or ES futures. Multi-asset expansion in Phase 4 only.

#### 3.4.2 Six-Gate Deterministic Safety Chain

Every trade signal that passes the Synthesis Layer must pass all 6 gates sequentially. A single FAIL at any gate blocks execution. Gates are evaluated in order; evaluation halts at first failure.

**Gate 1: Position Size Gate**
| Parameter | Threshold |
|-----------|-----------|
| Max position size (single symbol) | 5% of portfolio NAV |
| Max position size (with FinMA modifier) | `5% * suggested_position_modifier` |
| Min position size | $500 (to avoid commission drag) |
| PASS condition | Proposed position size within [min, max] range |
| FAIL action | Log rejection with proposed vs. allowed size |

**Gate 2: Drawdown Gate**
| Parameter | Threshold |
|-----------|-----------|
| Max daily drawdown | 2% of portfolio NAV |
| Max rolling 5-day drawdown | 5% of portfolio NAV |
| Max total drawdown from peak | 10% of portfolio NAV |
| PASS condition | Adding this trade does not project beyond any drawdown limit (using stop-loss as worst case) |
| FAIL action | No new trades until drawdown recovers to within 50% of limit |

**Gate 3: Volatility Gate**
| Parameter | Threshold |
|-----------|-----------|
| Max symbol ATR (14-period) relative to price | 5% (too volatile to size safely) |
| VIX circuit breaker | VIX > 35: reduce all new positions to 50% size |
| VIX hard stop | VIX > 45: no new entries (exit-only mode) |
| PASS condition | Symbol volatility within bounds AND VIX within bounds |
| FAIL action | Log with current ATR and VIX values |

**Gate 4: Correlation Gate**
| Parameter | Threshold |
|-----------|-----------|
| Max correlated positions (r > 0.7 over 20 days) | 3 symbols in same correlation cluster |
| Max sector exposure | 30% of portfolio NAV in any single GICS sector |
| PASS condition | New position does not breach correlation or sector limits |
| FAIL action | Log with correlation matrix excerpt and sector breakdown |

**Gate 5: Regime Gate**
| Parameter | Threshold |
|-----------|-----------|
| Regime-direction alignment | Long trades require regime != `bear_panic`; Short trades require regime != `bull_momentum` |
| Regime confidence minimum | 0.50 (if regime confidence < 0.50, gate passes with position size reduced 25%) |
| PASS condition | Trade direction aligns with or is neutral to current regime |
| FAIL action | Log with current regime and direction mismatch |

**Gate 6: Time-of-Day Gate**
| Parameter | Threshold |
|-----------|-----------|
| Primary trading window | EU/US market hours overlap: 14:30-16:30 UTC. Extended to full US session (14:30-21:00 UTC) where applicable. |
| No entries in first 5 minutes | 09:30-09:35 ET blocked (opening auction noise) |
| No entries in last 10 minutes | 15:50-16:00 ET blocked (closing auction distortion) |
| Reduced size in first 30 minutes | 09:30-10:00 ET: max 50% position size |
| FOMC / earnings blackout | No new entries 30 minutes before/after scheduled FOMC or held-symbol earnings |
| PASS condition | Current time is within allowed trading window |
| FAIL action | Log with current time and applicable restriction |

#### 3.4.3 Order Lifecycle

```
Signal Generated (Perception + Synthesis)
    |
    v
[Gate 1: Position Size] -- FAIL --> Reject + Log
    |
   PASS
    |
[Gate 2: Drawdown] -- FAIL --> Reject + Log
    |
   PASS
    |
[Gate 3: Volatility] -- FAIL --> Reject + Log
    |
   PASS
    |
[Gate 4: Correlation] -- FAIL --> Reject + Log
    |
   PASS
    |
[Gate 5: Regime] -- FAIL --> Reject + Log
    |
   PASS
    |
[Gate 6: Time-of-Day] -- FAIL --> Reject + Log
    |
   PASS
    |
[Order Placement via IBKR Gateway]
    |
    v
[Fill Confirmation]
    |
    v
[Position Tracking + Stop-Loss Attachment]
    |
    v
[Trade Outcome Logging (on close)]
```

**Order Placement Details**:
1. Calculate limit price: mid-price + 0.01 (buy) or mid-price - 0.01 (sell)
2. Submit bracket order: entry limit + take-profit limit + stop-loss stop
3. Set order timeout: 30 seconds. If not filled, cancel and re-evaluate
4. On fill confirmation: update position table, attach trailing stop if configured
5. Log: `trade_id`, `symbol`, `direction`, `quantity`, `fill_price`, `fill_time`, `order_type`, all gate results, `p_score`, `sentiment_score`, `finma_decision`, `finma_reasoning`

#### 3.4.4 Kill Switch

**Manual Trigger**: Operator presses "KILL" button on dashboard or sends `/kill` command.

**Automatic Triggers**:
| Condition | Action |
|-----------|--------|
| Daily P&L < -2% of NAV | Flatten all positions, enter safe mode |
| 5 consecutive losing trades | Pause new entries for 30 minutes |
| IBKR disconnected > 60 seconds | Flatten all positions via backup connection |
| Bi-LSTM inference failure for > 5 minutes | Enter deterministic-only mode |
| VIX spike > 20% in 5 minutes | Flatten all positions, alert operator |

**Kill Switch Execution**:
1. Cancel all open/pending orders
2. Submit market sell/cover orders for all open positions
3. Disable all new entry signals
4. Log kill switch activation with trigger condition and portfolio state
5. Require manual operator restart to resume trading

---

### 3.5 Analytics & Learning Loop

#### 3.5.1 Trade Outcome Capture

**Fields logged per trade** (stored in `trade_log` table):

| Field | Type | Description |
|-------|------|-------------|
| `trade_id` | VARCHAR | Unique identifier (MYTHOS-YYYYMMDD-HHMMSS-SYMBOL-DIR) |
| `symbol` | VARCHAR | Traded symbol |
| `direction` | ENUM | `long` or `short` |
| `entry_time` | TIMESTAMPTZ | Fill timestamp |
| `exit_time` | TIMESTAMPTZ | Close timestamp |
| `entry_price` | FLOAT | Fill price |
| `exit_price` | FLOAT | Close price |
| `quantity` | INT | Number of shares |
| `gross_pnl` | FLOAT | Raw P&L in USD |
| `net_pnl` | FLOAT | P&L after commissions |
| `commission` | FLOAT | Total commissions |
| `hold_duration_min` | INT | Minutes held |
| `p_score_at_entry` | FLOAT | Bi-LSTM probability score |
| `p_score_confidence` | FLOAT[] | Confidence interval |
| `sentiment_score` | FLOAT | PLTA-FinBERT score at entry |
| `regime_class` | VARCHAR | Regime at entry |
| `finma_decision` | VARCHAR | LOGIC_PASS or LOGIC_FAIL |
| `finma_reasoning` | TEXT | Full reasoning string |
| `finma_confidence` | FLOAT | FinMA confidence |
| `vix_at_entry` | FLOAT | VIX level |
| `yield_spread_at_entry` | FLOAT | 10Y-2Y spread |
| `gate_results` | JSONB | Full 6-gate pass/fail detail |
| `exit_reason` | VARCHAR | `take_profit`, `stop_loss`, `trailing_stop`, `kill_switch`, `manual`, `timeout` |
| `max_favorable_excursion` | FLOAT | Max unrealized profit during trade |
| `max_adverse_excursion` | FLOAT | Max unrealized loss during trade |

#### 3.5.2 Performance Dashboard

**Real-time Metrics** (update every tick):
- Current positions with unrealized P&L
- Net portfolio exposure (long vs. short)
- System health indicators (all 4 layers + IBKR connection)

**Session Metrics** (update per trade):
- Daily P&L (gross and net)
- Win rate (rolling 20 trades)
- Average win size / average loss size (profit factor)
- Sharpe ratio (rolling 30 days, annualized)
- Maximum drawdown (session and all-time)
- Trades executed / signals rejected (with rejection reason breakdown)

**Strategy Breakdown**:
- P&L by symbol
- P&L by regime class
- P&L by time-of-day bucket (morning, midday, afternoon)
- P-score calibration chart (predicted probability vs. actual win rate, binned)
- FinMA accuracy (LOGIC_PASS trades that were profitable vs. not)

#### 3.5.3 Model Feedback Loop

**Weekly Bi-LSTM Evaluation**:
1. Compute Brier score on last 5 trading days
2. Compare against baseline threshold (0.22)
3. If Brier > 0.25 for 2 consecutive weeks: trigger full retrain on expanding window
4. If Brier > 0.30 for 1 week: alert operator, switch to deterministic-only mode until retrained

**Weekly PLTA-FinBERT Evaluation**:
1. Measure sentiment-regime accuracy: did sentiment correctly classify the regime that materialized?
2. If accuracy < 70% over 10 trading days: revert TTA to base model, alert operator

**Monthly Strategy Review** (automated report):
1. Per-strategy Sharpe, drawdown, win rate
2. Gate rejection analysis: which gates block the most trades? Are rejections correlated with actual bad outcomes?
3. FinMA reasoning audit: sample 20 LOGIC_FAIL trades and verify the reasoning was sound
4. Model drift detection: are p-score distributions shifting?

---

## 4. Technical Architecture

### 4.1 System Diagram

```
                            MYTHOS System Architecture
  ==============================================================================

  EXTERNAL DATA                PYTHON SIDECAR (FastAPI)          NODE.JS ENGINE
  ─────────────               ──────────────────────            ───────────────
  ┌──────────┐                ┌─────────────────────┐          ┌──────────────┐
  │ GDELT v2 │───HTTP GET────>│ /ingest/gdelt       │          │              │
  └──────────┘                │                     │          │  Execution   │
  ┌──────────┐                │ PLTA-FinBERT        │          │  Engine      │
  │ FRED API │───HTTP GET────>│ /ingest/fred        │          │              │
  └──────────┘                │ (TTA daily)         │          │  - 6-Gate    │
                              │                     │          │    Safety    │
  ┌──────────┐                │ Output: sentiment   │──Redis──>│    Chain     │
  │ IBKR     │                │ scores + regime     │  Queue   │              │
  │ Gateway  │                ├─────────────────────┤          │  - Order     │
  │          │<──TCP Socket──>│ /inference/          │          │    Manager   │
  │ (TWS/GW) │                │   perception        │          │              │
  └──────────┘                │                     │          │  - Position  │
       ^                      │ Bi-LSTM Model       │──Redis──>│    Tracker   │
       |                      │ (PyTorch in-memory) │  Queue   │              │
       |                      ├─────────────────────┤          │  - Kill      │
       |                      │ /synthesis/evaluate  │          │    Switch    │
       |                      │                     │          │              │
       |                      │ FinMA (llama.cpp)   │──Redis──>│              │
       |                      │ (4-bit quantized)   │  Queue   │              │
       |                      └─────────────────────┘          └──────┬───────┘
       |                                                              |
       └──────────────────────────────────────────────────────────────┘
                                                                      |
                              ┌─────────────────────┐                 |
                              │ PostgreSQL 16        │<────────────────┘
                              │ + TimescaleDB        │
                              │                      │
                              │ - gdelt_raw          │
                              │ - gdelt_daily        │
                              │ - fred_series        │
                              │ - price_bars         │
                              │ - trade_log          │
                              │ - gate_audit         │
                              │ - model_metrics      │
                              └─────────────────────┘

                              ┌─────────────────────┐
                              │ Redis 7              │
                              │                      │
                              │ - signal_queue       │
                              │ - inference_cache    │
                              │ - position_state     │
                              └─────────────────────┘
```

### 4.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Model Inference | Python 3.11 + FastAPI + Uvicorn | Industry-standard ML serving; access to PyTorch, HuggingFace, llama-cpp-python |
| Execution Engine | Node.js 20 LTS | High-performance async I/O for order management and IBKR socket communication |
| Database | PostgreSQL 16 + TimescaleDB | Time-series optimized with hypertables; continuous aggregates; mature ecosystem |
| Message Queue | Redis 7 (Streams) | Sub-millisecond pub/sub between Python sidecar and Node.js engine |
| LLM Runtime | llama.cpp (via llama-cpp-python) | Efficient local inference of quantized FinMA model |
| NLP Model | Base FinBERT + custom TTA (HuggingFace + PyTorch) | Domain-specific financial sentiment with custom TTA implementation (~200 lines) |
| Sequence Model | Bi-LSTM (PyTorch) | Lightweight temporal prediction; trainable on CPU |
| Containerization | Docker Compose | Reproducible multi-service deployment |
| Monitoring | Prometheus + Grafana | Metrics collection and visualization |

### 4.3 Deployment

**Development / Paper Trading**:
- Single Hetzner VPS (CPX41: 8 vCPU, 16GB RAM, 240GB NVMe)
- Docker Compose with 4 services: `sidecar`, `engine`, `postgres`, `redis`
- IBKR Gateway in paper trading mode (port 4002)
- Estimated monthly cost: ~$30

**Production / Live Trading**:
- Hetzner dedicated server (AX42: AMD Ryzen 7, 64GB RAM, 2x1TB NVMe)
- Optional: NVIDIA RTX 3060 (12GB VRAM) for accelerated FinMA inference
- Docker Compose with the same 4 services + Prometheus + Grafana
- IBKR Gateway in live mode (port 4001)
- Daily automated backups to Hetzner Storage Box
- Estimated monthly cost: ~$80

**Scaling Path** (if needed):
- Separate GPU node for model training (rented on-demand from Hetzner or vast.ai)
- Horizontal scaling of the perception layer (multiple Bi-LSTM instances for different symbol groups)
- Read replicas of PostgreSQL for analytics queries

### 4.4 External API Dependencies

| API | Purpose | Auth | Rate Limit | Fallback |
|-----|---------|------|-----------|----------|
| IBKR Gateway | Order execution, price data | Local TCP (no API key) | 50 msg/s | Kill switch on disconnect |
| GDELT v2 | Global event data | None (public) | N/A | Use previous day's data |
| FRED API | Macroeconomic series | API key (free tier) | 120 req/min | Use cached data (updated daily) |
| FinMA model | Downloaded once, runs locally | N/A | N/A | Deterministic-only mode |

---

## 5. Non-Functional Requirements

### 5.1 Latency

| Stage | Budget | Measured At |
|-------|--------|-------------|
| Bar data received from IBKR | 0ms (baseline) | TCP socket callback |
| Feature engineering (OHLCV + sentiment merge) | < 5ms | Pre-inference |
| Bi-LSTM inference | < 100ms | FastAPI sidecar |
| Redis signal queue transit | < 2ms | Pub to sub |
| FinMA synthesis (not on hot path) | < 2,000ms | Pre-trade, async |
| 6-gate evaluation | < 10ms | Node.js engine |
| Order submission to IBKR | < 5ms | TCP socket send |
| **Total end-to-end (bar close to order)** | **< 500ms (p95)** | Instrumented |

### 5.2 Uptime

- Target: 99.9% during Regular Trading Hours (09:30-16:00 ET, Mon-Fri)
- Maximum allowable downtime: 23 minutes per month during RTH
- Health check endpoint: every 30 seconds, covering all 4 services + IBKR connection
- Automatic service restart on failure (Docker restart policy: `unless-stopped`)

### 5.3 Data Integrity

- No trade shall be executed without a complete gate audit log persisted to PostgreSQL
- All database writes use transactions; no partial trade records
- WAL (Write-Ahead Logging) enabled on PostgreSQL for crash recovery
- Redis persistence: AOF with `fsync` every second (acceptable 1-second data loss window for cache/queue)

### 5.5 Audit Log Retention

- Trade logs, model decisions, and gate audit trails retained for **7 years** per MiFID II Article 25 recordkeeping requirements
- TimescaleDB compression enabled for cost efficiency on historical audit data
- Retention policy enforced at database level; no manual purging permitted

### 5.4 Security

- All API keys stored in environment variables, never in code or configuration files committed to VCS
- `.env` files excluded via `.gitignore` and `.dockerignore`
- PostgreSQL: TLS for connections, encrypted at rest (LUKS on data volume)
- IBKR Gateway: runs on localhost only, no external network exposure
- FastAPI sidecar: bound to `127.0.0.1`, not externally accessible
- Docker network: internal bridge, only necessary ports exposed
- No telemetry or data exfiltration: the system sends nothing to external servers except IBKR orders and data API requests

---

## 6. Safety & Risk Framework

### 6.1 Six Safety Gates (Detailed)

See Section 3.4.2 for full gate specifications. Summary:

| Gate | Name | What it prevents |
|------|------|-----------------|
| G1 | Position Size | Oversized bets on a single symbol |
| G2 | Drawdown | Trading while in a loss spiral |
| G3 | Volatility | Entering positions in untradeable conditions |
| G4 | Correlation | Portfolio concentration in correlated assets |
| G5 | Regime | Trading against the macro environment |
| G6 | Time-of-Day | Entering during high-noise periods (open/close auctions) |

### 6.2 Automatic Circuit Breakers

| Breaker | Threshold | Action | Reset Condition |
|---------|-----------|--------|----------------|
| Daily loss limit | -2% NAV | Flatten all positions, safe mode | Next trading day (manual restart) |
| Consecutive loss limit | 5 consecutive losing trades | Pause new entries 30 minutes | Timer expires OR operator override |
| 5-minute drawdown | -3% NAV in any 5-minute window | Flatten all positions, alert | Operator manual restart |
| Weekly loss limit | -5% NAV in rolling 5 days | Safe mode for remainder of week | Monday open (manual restart) |
| Model confidence collapse | Bi-LSTM Brier > 0.30 for 1 week | Deterministic-only mode | Model retrained and validated |
| Infrastructure failure | Any critical service down > 5 min | Flatten positions if market open | Service restored + operator restart |

### 6.3 Regulatory Considerations

**Jurisdiction**: Ireland (EU MiFID II framework). PDT rule does NOT apply — no minimum equity requirement for day trading.

**Account Structure**: Individual retail account (IBKR). Initial capital from founder's personal account for platform validation.

**Applicable Regulations**:
- **MiFID II best execution**: Orders must achieve best execution per MiFID II requirements. Logged and auditable.
- **EMIR reporting**: Derivatives (ES futures) subject to EMIR trade reporting obligations.
- **Central Bank of Ireland oversight**: Compliance with local regulatory framework for retail trading activity.
- **MiFID II Article 25 recordkeeping**: Trade logs, model decisions, and gate audit trails retained for 7 years (see Section 5 NFR). TimescaleDB compression for cost efficiency.

**Wash Sale Rule**: Not applicable under Irish/EU tax law. No equivalent 30-day repurchase restriction.

**Reporting**:
- All trades logged with sufficient detail for Irish Revenue Commissioners reporting (CGT obligations)
- Daily P&L summary exportable in CSV format
- Year-end tax lot report generation (FIFO method)

---

## 7. Data Pipeline Specs

### 7.1 Full Data Flow

```
 05:00 ET                    09:25 ET              09:30 ET - 16:00 ET
 ──────────                  ──────────            ─────────────────────

 [Daily Pre-Market Pipeline]

 GDELT v2 ──> Download CSV ──> Parse ──> Filter ──> PLTA-FinBERT ──> sentiment_scores
                                                         |
 FRED API ──> Fetch series ──> Store ────────────────────>|
                                                         |
                                              ┌──────────v──────────┐
                                              │  Regime Classification │
                                              │  (per symbol)          │
                                              └──────────┬──────────┘
                                                         |
                                              Store in gdelt_daily

 [TTA Update - 16:30 ET previous day]

 Day's GDELT events + price outcomes ──> Multi-perturbation voting
    ──> Pseudo-label generation ──> Bounded gradient update ──> Validation
    ──> Persist updated weights (or revert)

 [Real-Time Trading Pipeline]

 IBKR bars (1m/5m) ──> Feature engineering (merge sentiment + macro)
    ──> Bi-LSTM inference (FastAPI) ──> p_score
    ──> FinMA synthesis (async) ──> LOGIC_PASS/FAIL
    ──> 6-gate safety chain ──> IBKR order ──> Fill ──> Position tracking
    ──> Trade outcome ──> trade_log
```

### 7.2 Latency Budget per Stage

| Stage | Operation | Target Latency | Tolerance |
|-------|-----------|---------------|-----------|
| GDELT download | HTTP GET + decompress | < 30 seconds | Non-critical (pre-market) |
| GDELT parse + filter | CSV processing | < 60 seconds for 150K rows | Non-critical |
| PLTA-FinBERT batch inference | Process day's events | < 5 minutes | Must complete before 09:25 ET |
| FRED fetch | API calls for 8 series | < 10 seconds | Non-critical |
| IBKR bar delivery | TCP socket | ~50ms after bar close | Platform-dependent |
| Feature engineering | Merge OHLCV + sentiment + macro | < 5ms | Critical |
| Bi-LSTM inference | Model forward pass | < 100ms | Critical |
| FinMA synthesis | LLM inference | < 2,000ms | Important but async |
| Gate evaluation | 6 sequential checks | < 10ms | Critical |
| Order submission | TCP send to IBKR | < 5ms | Critical |

### 7.3 Failure Modes and Recovery

| Failure Mode | Detection | Impact | Recovery |
|-------------|-----------|--------|----------|
| GDELT download fails | HTTP error / timeout | No fresh sentiment for today | Use previous day's scores; alert operator; retry at 12:00 ET |
| FRED API unavailable | HTTP error / timeout | Stale macro indicators | Use last known values (< 24h old); alert if data > 48h stale |
| PLTA-FinBERT TTA fails validation | Accuracy check | Model weights not updated | Revert to previous day's weights; continue with stale model |
| Bi-LSTM sidecar crash | Health check failure | No p-scores generated | Auto-restart (Docker); enter deterministic-only mode if down > 60s |
| FinMA sidecar crash | Health check failure | No synthesis validation | Enter deterministic-only mode (stricter thresholds); auto-restart |
| PostgreSQL unavailable | Connection failure | Cannot log trades or read history | Halt all new trades; write audit log to local file as fallback; alert |
| Redis unavailable | Connection failure | Signal queue broken | Direct HTTP calls between sidecar and engine; degraded latency |
| IBKR disconnection | Heartbeat failure | Cannot execute or monitor orders | Kill switch after 60s; reconnection attempts at 5s, 10s, 30s |
| Full disk | OS monitoring | Database writes fail | Automated alert at 80% capacity; emergency cleanup of old 1m bars |

---

## 8. Phasing Plan

### Phase 1: Foundation (Weeks 1-4)

**Deliverables**:
- Docker Compose setup: PostgreSQL/TimescaleDB + Redis + FastAPI sidecar + Node.js engine skeleton
- GDELT v2 ingestion pipeline: download, parse, filter, store in TimescaleDB
- FRED API integration: fetch and store all 8 series
- IBKR Gateway connection: authenticate, subscribe to market data, receive bars, place paper orders
- Basic position tracking and portfolio state management
- Health check endpoints for all services

**Success Criteria Before Advancing**:
- [ ] GDELT pipeline processes 3 consecutive trading days without failure
- [ ] FRED data fetched and stored for all 8 series
- [ ] IBKR paper trading connection stable for full trading session (6.5 hours)
- [ ] Limit order placed and filled on paper account
- [ ] All services start cleanly via `docker compose up`
- [ ] Health checks return 200 for all services

### Phase 2: Perception (Weeks 5-10)

**Deliverables**:
- Custom TTA implementation on base FinBERT: load model, process GDELT events, output sentiment scores and regime classification
- Daily TTA pipeline: post-market adaptation cycle with validation
- Bi-LSTM model: architecture implementation, training pipeline, walk-forward validation (confirmed as Phase 2 sequence model; Transformer evaluation deferred to Phase 3)
- Inference API: `/inference/perception` endpoint serving p-scores at < 100ms
- Historical backfill: 6 months of training data prepared and labeled
- Backtesting framework: replay historical bars through Ingest + Perception layers

**Success Criteria Before Advancing**:
- [ ] TTA-FinBERT produces sentiment scores for the target instrument daily
- [ ] TTA completes within 30 minutes post-market for 5 consecutive days
- [ ] Bi-LSTM achieves Brier score < 0.22 on walk-forward validation (5 folds)
- [ ] Inference latency < 100ms (p95)
- [ ] Backtest on 3 months of held-out data shows positive expectancy

### Phase 3: Synthesis & Safety (Weeks 11-16)

**Deliverables**:
- FinMA-7B integration: model download, 4-bit quantization (~4GB VRAM), llama.cpp serving, prompt engineering
- Synthesis API: `/synthesis/evaluate` endpoint with structured LOGIC_PASS/FAIL output
- Full 6-gate safety chain implementation with audit logging
- Kill switch (manual and all automatic triggers)
- End-to-end pipeline: bar close to paper order via all 4 layers
- Performance dashboard (basic): live P&L, positions, gate status, system health
- Transformer-based time-series model evaluation (benchmark against Bi-LSTM; adopt if superior)
- Minimum 3 months paper trading

**Go/No-Go Criteria for Phase 4** (CEO approval required):
- [ ] FinMA-7B returns structured JSON for 95%+ of evaluation requests
- [ ] FinMA synthesis latency < 2 seconds (p95)
- [ ] All 6 gates implemented and tested with unit tests covering edge cases
- [ ] Kill switch activates within 1 second of trigger condition in testing
- [ ] Minimum 3 months paper trading completed with full audit trail for every trade
- [ ] Paper trading Sharpe > 1.5 AND max drawdown < 8% over the paper trading window
- [ ] Zero instances of missing gate audit logs
- [ ] CEO approval required before proceeding to Phase 4

### Phase 4: Production (Weeks 17-24)

**Deliverables**:
- Transition from paper to live trading (individual retail IBKR account, founder's personal capital for platform validation)
- Production monitoring: Prometheus + Grafana dashboards
- Automated model evaluation and alerting (Bi-LSTM Brier monitoring, TTA-FinBERT accuracy tracking)
- Full performance dashboard with strategy breakdown and Irish tax reporting
- Learning loop: weekly batch model evaluation, automated retrain triggers
- Shannon entropy / FFT spectral analysis on tick data (enhancement — tick data integration)
- Multi-asset expansion planning (beyond SPY/ES)
- Operational runbook: startup, shutdown, incident response, model update procedures

**Success Criteria**:
- [ ] 30 days live trading with real capital
- [ ] Live Sharpe > 1.0 (lower bar than paper due to slippage and commissions)
- [ ] Max drawdown < 10% on live capital
- [ ] Zero unaudited trades
- [ ] All circuit breakers tested in production (controlled tests)
- [ ] Model retrain pipeline executes successfully at least once
- [ ] Operator can reconstruct any trade decision path within 30 seconds

---

## 9. Resolved Decisions

All architectural questions have been resolved by CEO decision (2026-04-04):

| # | Question | Decision |
|---|----------|----------|
| Q1 | FinMA model variant | **FinMA-7B, 4-bit quantized (~4GB VRAM)**. Upgrade path to 13B documented but deferred. |
| Q2 | Sequence model architecture | **Bi-LSTM for Phase 2. Transformer evaluation in Phase 3** — adopt if benchmarks show superiority. |
| Q3 | PLTA-FinBERT availability | **Implement TTA on base FinBERT** (~200 lines PyTorch). No pre-built PLTA-FinBERT available as drop-in. |
| Q4 | GDELT event-to-symbol mapping | **Sector aggregation first**. Phase 1-2: CAMEO actor codes to sector buckets, aggregate sentiment per sector. NER-to-ticker mapping deferred to Phase 3. |
| Q5 | Tick data for entropy/FFT | **Deferred to Phase 4**. Shannon entropy / FFT spectral analysis listed as Phase 4 enhancement. |
| Q6 | Model retrain cadence | **Weekly batch retrain** on rolling window. Online learning deferred — instability risk during drawdown. |
| Q7 | Instrument scope | **Single instrument (SPY or ES futures), Phases 1-3**. Multi-asset expansion in Phase 4 only. |
| Q8 | Paper trading go/no-go | **Minimum 3 months paper trading**. Go/no-go: Sharpe >1.5 AND max drawdown <8% over the window. CEO approval required before Phase 4. |
| Q9 | Account structure | **Individual retail account (IBKR)**. Initial capital from founder's personal account for platform validation. |
| Q10 | Jurisdiction | **Ireland (EU MiFID II framework)**. PDT rule does not apply. Relevant: MiFID II best execution, EMIR reporting for derivatives, Central Bank of Ireland oversight. |
| Q11 | Audit log retention | **7 years** per MiFID II Article 25 recordkeeping. TimescaleDB compression for cost efficiency. |

---

## 10. Remaining Open Questions

All architectural questions resolved. No open items.

---

*End of PRD v1.0*
