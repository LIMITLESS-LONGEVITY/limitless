# Self-Hosting Open-Source LLMs for PATHS LMS — Research Report

**Date:** 2026-03-23
**Context:** PATHS educational SaaS (Next.js + FastAPI, Vercel + Render, Frankfurt EU)
**Use cases:** AI-assisted learning (chat tutoring, content explanation, quiz generation) and AI-assisted content creation (article drafting, lesson generation, translation)
**Target volume:** ~10,000 inference requests/day with 7B-14B parameter models

---

## Table of Contents

1. [Platform Comparison](#1-platform-comparison)
2. [Open-Source Model Recommendations](#2-open-source-model-recommendations)
3. [Cost Estimates](#3-cost-estimates)
4. [Integration Architecture](#4-integration-architecture)
5. [Recommendation](#5-recommendation)

---

## 1. Platform Comparison

### 1.1 Modal (modal.com)

**How it works:** Python-native serverless GPU platform. You define functions with `@app.function(gpu="A10G")` decorators, Modal handles containerization, scaling, and GPU allocation. Code runs in ephemeral containers. Supports vLLM, TGI, and custom inference servers.

**Pricing (per-second billing):**
| GPU | $/hour | $/second |
|-----|--------|----------|
| T4 (16 GB) | $0.59 | $0.000164 |
| A10G (24 GB) | $1.10 | $0.000306 |
| A100 40 GB | $2.10 | $0.000583 |
| A100 80 GB | $2.50 | $0.000694 |
| H100 80 GB | $3.95 | $0.001097 |

Free tier: $30/month in compute credits. Regional multiplier: 1.25x for EU/US/UK.

**Model support:** Any model you can load — DeepSeek, Qwen, Llama, Mistral. You bring your own model weights and inference code (typically vLLM or HuggingFace). Full flexibility.

**Latency:** Cold starts of 2-4 seconds with warm container pooling. For always-warm endpoints, you can configure `keep_warm=1` (but you pay for idle time). Time-to-first-token once warm: typically 200-500ms for 7B-14B models on A10G.

**Integration pattern:** Deploys as HTTPS endpoints (REST API). Supports streaming via SSE. You call it like any API from your FastAPI backend. Also supports webhooks for async workloads. Works perfectly with both Vercel (frontend calls backend, backend calls Modal) and Render (backend calls Modal directly).

**EU region:** Yes. `region="eu"` ensures functions run in EU datacenters. Granular options like `eu-west-1`, `eu-paris-1`. GPU availability in EU may be more limited than US.

**Production readiness:** Used in production by many companies. Team and Enterprise plans available. No published SLA numbers on the free/team tier. Enterprise plan offers custom SLAs.

**Pros:**
- True pay-per-second, scales to zero (no cost when idle)
- Python-native DX — feels like writing normal Python
- EU regions available
- Full model flexibility
- Excellent for bursty/variable workloads

**Cons:**
- SDK lock-in (migrating requires rewriting deployment code)
- Cold starts (2-4s) affect first request after idle period
- EU GPU availability may be constrained for high-end GPUs
- No published uptime SLA on lower tiers

---

### 1.2 Hugging Face Inference Endpoints

**How it works:** Dedicated GPU instances running your chosen model. You select a model from the Hub, pick a GPU, pick a region, and HF provisions a persistent endpoint. Also offers a serverless tier for popular models.

**Pricing:**
| Tier | GPU | $/hour |
|------|-----|--------|
| Serverless (shared) | Varies | Pay-per-token (cheap for popular models) |
| Dedicated - T4 | T4 16 GB | ~$0.50 |
| Dedicated - A10G | A10G 24 GB | ~$1.30 |
| Dedicated - A100 | A100 80 GB | ~$4.50 |

Billed per minute while endpoint is running (including idle time). You can pause endpoints to stop billing but lose warm state.

**Model support:** Best-in-class. Direct access to the entire HuggingFace Hub — any model with a supported framework (TGI, vLLM, TEI). One-click deployment for thousands of models.

**Latency:** Dedicated endpoints: no cold starts (always running). Serverless: cold starts of 10-30s for less popular models, near-instant for popular cached models. TTFT on dedicated A10G with 7B model: ~200ms.

**EU region:** Yes. EU regions available (including Frankfurt). Full GDPR compliance with EU-hosted endpoints.

**Integration:** Standard REST API with OpenAI-compatible chat completion endpoints. Supports streaming. Dead simple to integrate — just an API URL and token.

**Production readiness:** Enterprise plan includes 24/7 SLA and dedicated support. Many production SaaS products use it. The dedicated tier is genuinely production-grade.

**Pros:**
- Easiest setup of all options — pick model, pick GPU, deploy
- EU regions with full data residency
- No cold starts on dedicated tier
- OpenAI-compatible API (easy to swap providers)
- Enterprise SLA available

**Cons:**
- Dedicated endpoints charge for idle time (no scale-to-zero)
- An A10G running 24/7 = ~$950/month even during low-traffic hours
- Less flexibility than Modal for custom inference logic
- Serverless tier has unpredictable cold starts

---

### 1.3 Replicate (replicate.com)

**How it works:** Serverless model hosting. Public models run on shared infrastructure. Private/custom models run on dedicated hardware.

**Pricing:** Per-second billing for GPU time. Rates vary by model and GPU. Typical: $0.000225/sec for A40 GPU. Private models pay for all time instances are online (including idle).

**Model support:** Large catalog of public models. Custom models via Cog (their packaging tool). Most popular open-source models available.

**Latency:** Cold starts of 16-60+ seconds for custom models — significantly worse than competitors. Public popular models can be faster due to shared warm pools.

**EU region:** No dedicated EU region. US-based infrastructure primarily.

**Production readiness:** Widely used for prototyping. Cold start latency and cost unpredictability are concerns for production SaaS.

**Verdict: Not recommended for PATHS.** Cold start latency (16-60s) is unacceptable for an interactive learning platform. No EU region. Cost unpredictability for custom models. Better suited for prototyping than production SaaS.

---

### 1.4 RunPod (runpod.io)

**How it works:** GPU cloud with both persistent pods (dedicated VMs) and serverless endpoints. Serverless: you deploy a Docker container with your model, RunPod handles scaling.

**Pricing:**
| GPU | Serverless $/hr | Pod $/hr (on-demand) |
|-----|-----------------|---------------------|
| RTX 4090 (24 GB) | $0.44 | $0.44 |
| A100 80 GB | $2.17 | $1.64 |
| H100 80 GB | $2.69 | $2.49 |
| RTX 3090 (24 GB) | ~$0.20 | ~$0.20 |

Per-second billing on serverless. Active Workers (always-on) get up to 30% discount.

**Model support:** Full flexibility — you bring your own Docker container. Supports vLLM, TGI, or any custom setup.

**Latency:** Claims 48% of serverless cold starts under 200ms ("FlashBoot"). Large containers (LLMs): 6-12 seconds cold start. Active Workers eliminate cold starts entirely.

**EU region:** Yes. Multiple EU datacenters: EU-RO-1, EU-CZ-1, EU-FR-1 (France), EU-NL-1, EU-SE-1. GPU availability varies by region.

**Integration:** REST API endpoints. Supports streaming. Works with any backend.

**Production readiness:** Growing adoption for production workloads. No formal SLA published. Status page available at uptime.runpod.io.

**Pros:**
- Competitive pricing, especially for RTX 4090
- EU regions available
- FlashBoot for faster cold starts
- Active Workers for zero cold starts
- Full Docker flexibility

**Cons:**
- More DIY than Modal or HuggingFace (you manage Docker images)
- Community GPU providers (variable reliability in some regions)
- No enterprise SLA
- Requires more operational knowledge

---

### 1.5 Together AI (together.ai)

**How it works:** Managed API for 200+ open-source models. You call their API — they handle all infrastructure. Also offers dedicated endpoints and fine-tuning.

**Pricing (serverless per-token):**
| Model | Input $/1M tokens | Output $/1M tokens |
|-------|-------------------|---------------------|
| Llama 3.3 8B | $0.18 | $0.18 |
| DeepSeek-V3.1 | $0.60 | $1.70 |
| Qwen 3 8B | ~$0.20 | ~$0.20 |
| Qwen 3 72B | ~$0.90 | ~$0.90 |
| DeepSeek R1 | ~$2.00 | ~$4.00 |

Prices range from $0.03/1M tokens (tiny models) to $4.00/1M tokens (large reasoning models).

**Model support:** 200+ models including DeepSeek V3/V3.1, Qwen 3 family, Llama 3.x, Mistral, Phi-4, and more. Best model selection of any provider.

**Latency:** No cold starts — models are always warm on their infrastructure. TTFT typically 100-300ms for smaller models. Fastest inference speeds among API providers (custom hardware, speculative decoding).

**EU region:** Yes. Infrastructure live in Sweden (EU) since late 2025. EU data residency available. Reduces latency by 50-70ms for European users vs US-based inference.

**Integration:** OpenAI-compatible API. Drop-in replacement — change the base URL and API key. Supports streaming, function calling, JSON mode. Trivial to integrate with Next.js/FastAPI.

**Production readiness:** High. Used by many production SaaS companies. Enterprise tier with SLAs available. SOC 2 compliant.

**Pros:**
- Zero operational overhead — pure API, no GPUs to manage
- OpenAI-compatible API (trivial migration to/from other providers)
- EU region (Sweden) for GDPR compliance
- No cold starts, excellent latency
- Best price/performance for open-source models
- 200+ model selection
- Fine-tuning available

**Cons:**
- Not "self-hosting" — you depend on Together AI's infrastructure
- Less control over model configuration
- Data passes through their servers (though EU region mitigates GDPR concerns)
- Pricing can change

---

### 1.6 Render GPU Instances

**Render does NOT offer GPU instances.** Based on community forums and documentation, Render focuses on CPU-based web services, databases, and cron jobs. There is no GPU offering.

This means your FastAPI backend on Render cannot directly run LLM inference. You must call an external GPU service (Modal, Together AI, HuggingFace, etc.) from your Render backend.

---

### 1.7 Self-Hosting on GPU VPS (Lambda Labs, Vast.ai)

**Lambda Labs:**
- H100: $2.49/hr (~$1,793/month 24/7)
- A100 PCIe: $1.25/hr (~$900/month 24/7)
- Pre-configured ML stack (CUDA, PyTorch)
- Reliable, enterprise-grade
- No EU region (US datacenters only)

**Vast.ai:**
- Peer-to-peer GPU marketplace
- H100: from $1.87/hr (variable)
- RTX 4090: from $0.25/hr
- Cheapest option, but variable reliability
- Some EU machines available (community-provided)
- No SLA, no guarantees

**Operational complexity:** High. You manage:
- Server provisioning and monitoring
- Model loading and optimization (vLLM, quantization)
- Auto-scaling (or manual scaling)
- Updates, security patches
- Failover and redundancy

**Realistic for a small team?** No, not for production SaaS. The operational burden is significant. A single GPU VPS is a single point of failure. Setting up redundancy, monitoring, auto-scaling, and updates requires dedicated DevOps effort. The math only favors self-hosting at very high volumes (100M+ tokens/day).

**Verdict: Not recommended for PATHS at current scale.** The operational complexity is disproportionate to the cost savings. Revisit only if you reach sustained high volume (100K+ requests/day) and have dedicated DevOps capacity.

---

## 2. Open-Source Model Recommendations

### 2.1 Best Models for Educational/LMS Use Cases (March 2026)

#### Tier 1: Sweet Spot for PATHS (7B-14B parameters)

**Qwen 3 8B** (Apache 2.0)
- Hybrid thinking/non-thinking modes — perfect for education (deep reasoning when needed, fast responses otherwise)
- 128K context window
- 119 languages and dialects — excellent for translation use case
- Runs on a single A10G (24 GB) with room to spare
- VRAM: ~16 GB at FP16, ~8 GB at INT4
- Best overall choice for educational chat tutoring

**Qwen 3 14B** (Apache 2.0)
- Same capabilities as 8B but noticeably better quality
- Still fits on a single A10G at FP16
- VRAM: ~28 GB at FP16, ~14 GB at INT4
- Best choice when quality matters more than speed (content creation, lesson generation)

**Phi-4 14B** (MIT License)
- Punches well above its weight on reasoning benchmarks
- Matches models 5-10x its size on STEM reasoning
- Excellent for quiz generation and content explanation
- VRAM: ~28 GB at FP16

**Llama 3.3 8B** (Meta License)
- Most widely deployed, best ecosystem support
- Strong general-purpose performance
- Runs on 8 GB VRAM at INT4
- Good baseline/fallback model

#### Tier 2: Higher Quality (needs more GPU)

**Qwen 3 32B** (Apache 2.0)
- Significantly better than 14B for complex tasks
- Requires A100 40 GB or equivalent
- Good for premium content creation features

**Qwen 3 30B-A3B MoE** (Apache 2.0)
- 30B total, only 3B active per token — very efficient
- Quality close to 32B dense, speed close to 4B
- Excellent price/performance ratio

#### Tier 3: Frontier (not recommended for self-hosting)

**DeepSeek V3.2** (685B total, 37B active per token)
- Frontier-class performance, competitive with GPT-4
- Requires 8x H100/H200 for FP8 inference — $31+/hour
- Not practical for self-hosting at PATHS scale
- Best accessed via Together AI API ($0.60/$1.70 per 1M tokens)

**Qwen 3 235B-A22B MoE**
- Similar story — enormous model, needs multi-GPU setup
- Access via API providers instead

### 2.2 Model-to-Use-Case Mapping

| Use Case | Recommended Model | Why |
|----------|------------------|-----|
| Chat tutoring (real-time) | Qwen 3 8B | Fast TTFT, thinking mode for hard questions, 119 languages |
| Content explanation | Qwen 3 14B | Better quality, still fast enough for near-real-time |
| Quiz generation | Phi-4 14B or Qwen 3 14B | Strong reasoning for well-structured questions |
| Article drafting | Qwen 3 14B | Good long-form generation, multilingual |
| Lesson generation | Qwen 3 14B or 32B | Complex structured output, benefits from larger model |
| Translation | Qwen 3 8B | 119 languages, fast, good quality |
| Summarization | Qwen 3 8B | 128K context, efficient |

---

## 3. Cost Estimates

### Assumptions
- 10,000 requests/day
- Average request: 500 input tokens + 500 output tokens (1,000 total)
- 10M tokens/day total
- 300M tokens/month
- Primary model: 8B-14B parameter range

### 3.1 Together AI (API)

| Model | Monthly Cost |
|-------|-------------|
| Qwen 3 8B (~$0.20/1M) | ~$60/month |
| Qwen 3 14B (~$0.30/1M) | ~$90/month |
| DeepSeek V3.1 ($0.60+$1.70/1M avg ~$1.15) | ~$345/month |

**Total estimated: $60-150/month** for 8B-14B models. Extremely cost-effective. No GPU management. No idle costs.

### 3.2 Modal (Serverless GPU)

Assumptions: A10G GPU ($1.10/hr), 7B model processes ~30 tokens/sec, each request takes ~35 seconds of GPU time.

- 10,000 requests × 35s = 97 GPU-hours/day
- 97 hours × $1.10 = ~$107/day = **~$3,200/month**

With warm pool optimization (batching, concurrent requests):
- Realistic: ~50 GPU-hours/day = **~$1,650/month**

With scale-to-zero during off-hours (assuming 12 active hours):
- ~25 GPU-hours/day = **~$825/month**

**Note:** These estimates assume sequential processing. With vLLM continuous batching, throughput improves 3-5x, bringing costs down to **~$500-800/month**.

### 3.3 Hugging Face Dedicated Endpoint

A10G 24/7: $1.30/hr × 730 hours = **~$950/month**

Handles 10K requests/day easily with a single A10G running a 7B-14B model. But you pay for 24/7 uptime regardless of traffic.

### 3.4 RunPod (Serverless)

RTX 4090 at $0.44/hr, similar calculation to Modal:
- ~50 GPU-hours/day × $0.44 = ~$22/day = **~$660/month**

With Active Workers (30% discount): **~$460/month**

### 3.5 Cost Comparison Summary

| Provider | Monthly Cost (est.) | Operational Effort | EU Region |
|----------|--------------------|--------------------|-----------|
| **Together AI** | **$60-150** | **None** | **Yes (Sweden)** |
| RunPod Serverless | $460-660 | Medium | Yes |
| Modal | $500-800 | Medium | Yes |
| HuggingFace Dedicated | ~$950 | Low | Yes |
| Lambda Labs (24/7 VPS) | ~$900-1,800 | High | No |
| Replicate | Unpredictable | Low-Medium | No |

---

## 4. Integration Architecture

### Recommended: FastAPI Backend as AI Gateway

```
User (Next.js on Vercel)
  │
  ▼
FastAPI Backend (Render, Frankfurt)
  │
  ├── /api/ai/chat          → Together AI API (Qwen 3 8B, streaming)
  ├── /api/ai/explain        → Together AI API (Qwen 3 14B)
  ├── /api/ai/quiz           → Together AI API (Qwen 3 14B)
  ├── /api/ai/draft          → Together AI API (Qwen 3 14B)
  ├── /api/ai/translate      → Together AI API (Qwen 3 8B)
  └── /api/ai/summarize      → Together AI API (Qwen 3 8B)
```

### Why route through FastAPI (not call from Vercel directly)?

1. **API key security** — keys stay on the backend, never exposed to the client
2. **Rate limiting** — enforce per-user/per-tier limits in FastAPI
3. **Prompt management** — system prompts, guardrails, and context injection happen server-side
4. **Usage tracking** — log token counts per user for billing/analytics
5. **Provider abstraction** — swap Together AI for Modal or HuggingFace without touching the frontend
6. **Streaming** — FastAPI can proxy SSE streams from Together AI to the frontend

### Integration Code Pattern (FastAPI)

```python
# Using OpenAI-compatible SDK (Together AI is a drop-in)
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://api.together.xyz/v1",
    api_key=settings.TOGETHER_API_KEY,
)

@router.post("/ai/chat")
async def ai_chat(request: ChatRequest, user: User = Depends(get_current_user)):
    # Check user tier / rate limit
    # Build system prompt with educational context
    # Call Together AI
    response = await client.chat.completions.create(
        model="Qwen/Qwen3-8B",
        messages=[
            {"role": "system", "content": TUTOR_SYSTEM_PROMPT},
            *request.messages,
        ],
        stream=True,
    )
    # Stream response back to frontend
    return StreamingResponse(stream_generator(response))
```

### Migration path if you outgrow Together AI

1. **Phase 1 (now):** Together AI API — zero ops, lowest cost
2. **Phase 2 (if needed):** Modal or RunPod serverless — more control, still scales to zero
3. **Phase 3 (high volume):** HuggingFace Dedicated or RunPod Active Workers — predictable performance
4. **Phase 4 (very high volume):** Self-hosted on dedicated GPU cluster — only if 100K+ requests/day sustained

Because Together AI uses OpenAI-compatible API, migrating to any other OpenAI-compatible provider (or your own vLLM endpoint) requires changing only the `base_url` and `api_key`.

---

## 5. Recommendation

### Primary: Together AI

**Together AI is the clear winner for PATHS at current scale.**

- **Cost:** $60-150/month for 10K requests/day — 5-10x cheaper than any self-hosted option
- **EU data residency:** Sweden datacenter, operational since late 2025
- **Zero ops:** No GPUs to manage, no containers, no scaling configuration
- **Model selection:** 200+ models, including Qwen 3, DeepSeek V3, Llama 3.3, Phi-4
- **Latency:** No cold starts, 100-300ms TTFT, streaming supported
- **Integration:** OpenAI-compatible API — trivial to integrate with FastAPI
- **Production-grade:** SOC 2, enterprise SLAs available
- **Future flexibility:** If you outgrow it, the OpenAI-compatible API means you can migrate to Modal/RunPod/self-hosted vLLM by changing two config values

### Fallback / Future: Modal

If you need more control (custom model fine-tuning, custom inference logic, or specific EU region guarantees beyond what Together AI offers), Modal is the best serverless GPU option:

- Python-native, excellent DX
- EU regions available
- True scale-to-zero
- Full model flexibility

### Model Strategy

Start with two models:
1. **Qwen 3 8B** — for all real-time interactive features (chat tutoring, translation, summarization). Fast, cheap, 119 languages.
2. **Qwen 3 14B** — for quality-sensitive features (content creation, lesson generation, quiz generation). Better output quality, still affordable.

Both are Apache 2.0 licensed. Both are available on Together AI. If you need frontier-class quality for specific features, DeepSeek V3.1 is available on Together AI at $0.60/$1.70 per 1M tokens — still far cheaper than self-hosting.

### What NOT to do

- Do not self-host DeepSeek V3.2 (685B) — requires 8x H100, costs $31+/hour in GPU time
- Do not use Replicate for production (16-60s cold starts, no EU region)
- Do not rent a dedicated GPU VPS at this scale — operational burden is not worth the marginal savings
- Do not run GPU workloads on Render — it does not support GPUs

---

## Sources

- [Modal Pricing](https://modal.com/pricing)
- [Modal Region Selection](https://modal.com/docs/guide/region-selection)
- [Modal GPU Docs](https://modal.com/docs/guide/gpu)
- [Hugging Face Inference Endpoints Pricing](https://huggingface.co/docs/inference-endpoints/en/pricing)
- [Hugging Face Inference Endpoints](https://huggingface.co/inference-endpoints/dedicated)
- [Replicate Pricing](https://replicate.com/pricing)
- [RunPod Pricing](https://www.runpod.io/pricing)
- [RunPod Serverless](https://www.runpod.io/product/serverless)
- [RunPod Global Networking Expansion](https://www.runpod.io/blog/runpod-global-networking-expansion)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Together AI Models](https://www.together.ai/models)
- [Together AI European Expansion (Sweden)](https://www.prnewswire.com/news-releases/together-ai-continues-european-expansion-infrastructure-now-live-and-operational-in-sweden-302545683.html)
- [Together AI Data Center Locations](https://www.together.ai/data-center-locations)
- [DeepSeek V3 Technical Report](https://arxiv.org/abs/2412.19437)
- [DeepSeek V3.2 GPU Requirements](https://apxml.com/posts/system-requirements-deepseek-models)
- [Qwen 3 GitHub](https://github.com/QwenLM/Qwen3)
- [Qwen 3 8B on HuggingFace](https://huggingface.co/Qwen/Qwen3-8B)
- [Best Open Source LLM for Education & Tutoring 2026](https://www.siliconflow.com/articles/en/best-open-source-LLM-for-education-tutoring)
- [Serverless LLM Deployment: RunPod vs Modal vs Lambda 2026](https://blog.premai.io/serverless-llm-deployment-runpod-vs-modal-vs-lambda-2026/)
- [9 Best Serverless GPU Providers for LLM Inference 2026](https://blog.premai.io/9-best-serverless-gpu-providers-for-llm-inference-2026/)
- [Self-Host LLM vs API: Real Cost Breakdown 2026](https://devtk.ai/en/blog/self-hosting-llm-vs-api-cost-2026/)
- [Render GPU Forum Discussion](https://community.render.com/t/does-render-offer-gpus/11222)
- [Lambda AI Pricing](https://lambda.ai/pricing)
- [Open Source LLM Deployment Cost 2026](https://aisuperior.com/open-source-llm-deployment-cost/)
