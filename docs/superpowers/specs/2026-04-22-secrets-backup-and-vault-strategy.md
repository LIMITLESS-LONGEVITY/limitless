---
title: "Secrets Backup & Vault Strategy — LIMITLESS Division"
date: 2026-04-22
status: DRAFT for CEO review
author: LIMITLESS Director (session synthesis)
---

# Secrets Backup & Vault Strategy — LIMITLESS Division

## Executive Summary

The immediate trigger (backing up one Ed25519 git signing key from a single WSL instance) is a narrow problem that can be solved today in under 30 minutes with `age` + a private GitHub repo (zero cost, zero new infra). The 12–18 month picture is meaningfully different: 50–150 secrets, 5+ autonomous Architect agents needing programmatic access, a MYTHOS subsidiary requiring tamper-evident audit logs, and a dispatcher model where the CEO should not be in the loop for routine secret fetches. **The recommendation is a two-phase approach: use SOPS+age immediately for the key backup, and adopt Infisical Cloud (Pro tier) as the division-wide vault within 60 days.** HCP Vault Secrets is dead (EOL July 2026). Self-hosted Vault is overkill and a maintenance trap at this team size. 1Password Business is the credible alternative if UX is prioritized over open-source.

---

## Two Scope Framings

| Scope | Problem | Time horizon |
|-------|---------|--------------|
| **Narrow** | Back up 1 SSH Ed25519 private key from WSL; prevent single-point-of-failure | Today |
| **Wide** | Division-level secrets infra: ~50–150 secrets, 5+ Architect containers, @aradSmith access, MYTHOS audit trail, programmatic fetch without CEO in loop | 0–18 months |

The narrow recommendation is SOPS+age (see "Recommended Next Steps"). The wide recommendation is Infisical Cloud Pro. These compose: Infisical can ingest the key later, and SOPS+age can remain as the offline cold-backup layer for signing keys specifically.

---

## Options Table

| Option | TCO Y1 | TCO Y2 | Agent access | Audit trail | Ops burden | Narrow fit | Wide fit |
|--------|--------|--------|-------------|-------------|-----------|-----------|---------|
| **SOPS + age + private GitHub repo** | $0 | $0 | Manual; containers need age key injected | `git log` only; decryption log to Postgres optional | Minimal — no server | ★★★★★ | ★★☆☆☆ |
| **Infisical Cloud (Pro)** | ~$216/yr ($18/mo × 1 identity seat + machine identities) | ~$216–$432/yr | Native SDK, CLI, machine identity tokens; containers fetch at boot | 90-day audit log Pro, extensible Enterprise | None (SaaS) | ★★★☆☆ | ★★★★★ |
| **Infisical Self-Hosted (Community)** | ~$0 + Hetzner CX11 (~$4/mo) = ~$50/yr | same | Same SDK/CLI | Audit logs in Community edition | Postgres + Redis + upgrade ops | ★★☆☆☆ | ★★★★☆ |
| **HashiCorp Vault (self-hosted OSS)** | ~$50/yr (CX11) | same + staff time | Excellent SDK; Vault Agent sidecar | Full audit device, tamper-evident | High — HA, unsealing, upgrades need expertise | ★☆☆☆☆ | ★★★☆☆ |
| **HCP Vault Dedicated** | ~$13,800/yr (cheapest prod cluster ~$1,152/mo) | same | Excellent | Enterprise-grade | Low (managed) | ✗ (EOL pending) | ★★☆☆☆ (cost) |
| **1Password Business** | ~$192/yr ($7.99 × 2 humans × 12) | same | `op` CLI + service accounts; SDK for Go/JS/Python; 100 service accounts max | 365-day activity log | None (SaaS) | ★★★☆☆ | ★★★★☆ |
| **Doppler (Developer free)** | $0 | $0 or $21/user/mo (Team) | Service tokens for containers; CLI; 50 tokens free tier | 3 days free / 90 days Team | None (SaaS) | ★★★☆☆ | ★★★☆☆ |
| **Bitwarden Secrets Manager / Vaultwarden** | ~$0 self-hosted | same | Machine accounts + SDK (Go, Python, Java); Vaultwarden does NOT support Secrets Manager | Basic audit | Moderate (self-host) | ★★☆☆☆ | ★★☆☆☆ |
| **GCP Secret Manager** | ~$6/yr (6 secrets × $0.06/mo) + GCP account overhead | scales | REST API; client libraries all languages | Cloud Audit Logs (tamper-evident) | Low | ★★★☆☆ | ★★☆☆☆ (new cloud dependency) |

---

## Top 3 Ranked Options

### 1. Infisical Cloud (Pro) — Recommended for Wide

**Why it wins for LIMITLESS:** Infisical is the only option that simultaneously hits open-source origin (AGPLv3 core, MIT SDK), modern agent-first design, real machine identity support, no operational burden, and a price point under $50/mo at your scale. The "Pro at $18/mo per identity" framing is per *human* identity seat — machine identities (Architect containers) use Universal Auth tokens and are not charged per-identity at the Pro tier based on current docs, though this should be confirmed before purchase.

**Pros:**
- Machine Identity with Universal Auth: containers call `infisical secrets get` or use the Node/Python SDK at boot; no CEO intervention per fetch
- 90-day audit log at Pro tier; tamper-evident log export available at Enterprise (relevant when MYTHOS goes live)
- SDK exists for Node.js (the Architect container runtime) — `@infisical/sdk`
- Self-hostable later if compliance requires data residency in EU (Hetzner Germany already)
- Active development, 16k+ GitHub stars, raised Series A (2024), strong 2025–2026 review coverage — not a fly-by-night

**Cons:**
- $18/mo per identity seat pricing is opaque about machine identity costs at scale — needs vendor confirmation
- Pro audit retention is 90 days; MiFID II may require longer (typically 5 years for trading records) — that's an Enterprise conversation, not a blocker today since MYTHOS is pre-launch
- Cloud SaaS means secrets leave your infra; self-hosted Community edition removes that concern but adds ops

**TCO reality check:** 2 humans + 5–8 machine identities. If machine identities are flat-rate or free under Pro: ~$36/mo. If machine identities are billed per-identity: potentially $18 × 10 = $180/mo, which approaches the wrong end of your budget. **Clarify this with Infisical before committing.** Fallback: self-hosted Community on CX11 (~$4/mo) covers this case at near-zero cost.

---

### 2. SOPS + age + Private GitHub Repo — Recommended for Narrow (and as cold-backup layer)

**Why it wins for immediate key backup:** Zero cost, zero new infra, zero vendor dependency, works today. The Ed25519 signing key is 444 bytes; encrypted with `age`, it becomes a ~600-byte binary blob committed to a private repo. Recovery is `age -d -i ~/.age/key.txt signing_key.age > ~/.ssh/chmod735_git_signing`. Audit trail is `git log --follow`.

**Pros:**
- Immediate: 30 minutes to set up, no accounts needed beyond existing GitHub
- No server attack surface — secrets are encrypted at rest in a repo you already control
- SOPS supports multiple recipients: encrypt once, decrypt with CEO key OR backup hardware key (YubiKey-resident age key is a natural pairing)
- `git log` gives timestamped change history; optional SOPS PostgreSQL audit log for decryption events
- Excellent for signing keys specifically: infrequently accessed, high value, benefit from offline cold storage

**Cons:**
- Not a live secrets API — Architect containers cannot call `sops decrypt` autonomously without being given the age private key (which then becomes a secret that needs managing — turtles all the way down)
- Fine-grained access control is weak: one age key = access to all files encrypted with that recipient
- No secret rotation, no dynamic secrets, no expiry enforcement
- The audit trail for *decryption* requires optional Postgres setup; without it, you only know the file changed, not who read it

**Verdict for narrow scope:** Use this now. Verdict for wide scope: use as the offline cold-backup layer for signing keys only, not as the primary secrets API.

---

### 3. 1Password Business — Credible Alternative if Open-Source Not a Priority

**Why it's worth considering:** 1Password has first-class Claude Code integration (their docs explicitly call it out), excellent `op` CLI for containers (`op run -- node server.js` injects secrets as env vars), up to 100 service accounts on Business, and a 365-day activity log that beats Infisical Pro's 90-day retention out of the box.

**Pros:**
- Polished UX for human secrets management (CEO + @aradSmith have a real vault app)
- `op` CLI service accounts work in Docker containers: `op read "op://vault/item/field"` returns plaintext to stdout — easy to integrate in `entrypoint.sh`
- 365-day audit log at Business tier (better than Infisical Pro for MiFID II runway)
- Actively maintained, market-leading reputation, not going anywhere

**Cons:**
- $7.99/user/mo — only 2 humans today, so $192/yr. Reasonable. But *service accounts do not count as users* — they are included in Business. This is actually good news.
- Closed source — no self-hosted option; secrets always in 1Password's cloud (US jurisdiction by default; EU Business option exists)
- SDK is newer and less battle-tested than Infisical's for agentic/machine use cases
- Migration off 1Password later is painful (proprietary export format)

**TCO:** ~$192/yr for 2 users. Service accounts are included. Competitive.

---

## Eliminations with Rationale

**HCP Vault Secrets:** Dead. End of sale June 30, 2025; EOL July 1, 2026. Do not evaluate further.

**HashiCorp Vault self-hosted:** The ops burden is genuinely mismatched to a 1-person CEO + autonomous agent team. Vault requires unsealing on restart, HA setup for any reliability, and specialized knowledge to upgrade. The free OSS tier is powerful but you'd spend more in engineering time than the tool saves. Re-evaluate only if MYTHOS reaches Series A and needs on-prem HSM integration.

**Doppler:** Free tier is 3-day audit log retention and 50 service tokens — serviceable for dev. Team is $21/user/mo which is more expensive than 1Password with a less mature offering. The recent free-tier cuts signal commercial pressure. Not a compelling fit.

**GCP Secret Manager:** Introducing GCP solely for secrets management while decommissioning AWS would be trading one cloud dependency for another. GCP Secret Manager is excellent, but the overhead of a GCP account, billing, IAM, and the cognitive load of a third cloud is not justified when Infisical or 1Password cover the need at lower operational complexity.

**Vaultwarden:** Vaultwarden does not support Bitwarden Secrets Manager (it is a licensed, non-OSS feature). This is a hard stop for the agent-access use case. Vaultwarden is a personal password manager alternative, not a secrets API for containers.

---

## Open Questions / CEO Decisions Required

1. **Infisical machine identity pricing:** Does Pro tier charge per machine identity or only per human seat? This is the difference between ~$36/mo and ~$180/mo. Confirm at [infisical.com/pricing](https://infisical.com/pricing) or email sales before committing.

2. **Data residency for MYTHOS:** MiFID II requires records retention of up to 5 years for certain trade-related data. Secrets *access logs* are arguably in scope. Infisical Cloud is US-hosted by default — does MYTHOS compliance require EU? If yes, self-hosted Infisical Community on Hetzner Germany is the answer, and the cost difference is trivial.

3. **YubiKey as cold-backup for signing keys:** The new `chmod735_git_signing` key (and the two GitHub App `.pem` keys) are high-value, low-frequency-access keys that benefit from hardware protection. A YubiKey 5 NFC ($50 one-time) + `age` plugin (`age-plugin-yubikey`) gives a hardware-backed offline backup that complements whichever cloud vault is chosen. Is this worth the $50 + 2-hour setup?

4. **@aradSmith vault access scope:** When @aradSmith becomes active on MYTHOS, should they have access to LIMITLESS secrets or only MYTHOS-scoped secrets? Infisical supports per-project isolation natively; 1Password uses separate vaults. This shapes how you provision their identity from day one.

5. **Self-hosted vs. Cloud for Infisical:** If machine identity pricing is per-seat and expensive, self-hosted Community on a CX11 ($4/mo) is the fallback. Requires Postgres + Redis — adds ~2 hours of Ansible work (hand off to Infra Architect). Decision gate: confirm Infisical pricing first.

---

## Recommended Next Steps

**This week — narrow (signing key backup):**
1. `age-keygen -o ~/.age/backup.key` — generate a dedicated age key for backup use
2. `age -r $(age-keygen -y ~/.age/backup.key) -o ~/chmod735_git_signing.age ~/.ssh/chmod735_git_signing`
3. Commit `chmod735_git_signing.age` (encrypted) and `chmod735_git_signing.pub` (plaintext) to a new private repo `limitless-key-backup` under `chmod735-dor`
4. Store `~/.age/backup.key` in a second location (encrypted cloud drive, or print as QR code for physical backup)
5. Add the two GitHub App `.pem` files from `~/.config/limitless/github-apps/` to the same repo, same process

**Within 30 days — wide (division vault):**

6. Confirm Infisical Pro machine identity pricing (one email or pricing page check)
7. If pricing is acceptable: sign up for Infisical Cloud Pro, create two projects (`limitless` and `mythos`), and migrate secrets from `~/.config/limitless/secrets.env` in order of risk (start with Discord bot tokens, then GitHub PATs, then Anthropic key)
8. Write an Infisical fetch snippet for `entrypoint.sh` using `infisical secrets get` or the Node SDK — dispatch this to the Infra Architect
9. If pricing is not acceptable: dispatch an Ansible task to the Infra Architect to deploy Infisical Community on VPS-1 (Postgres + Redis + infisical/infisical Docker Compose stack)

---

## Footnotes

- Infisical pricing: [infisical.com/pricing](https://infisical.com/pricing)
- Infisical machine identities docs: [infisical.com/docs/documentation/platform/identities/machine-identities](https://infisical.com/docs/documentation/platform/identities/machine-identities)
- HCP Vault Secrets EOL: [infisical.com/blog/hashicorp-vault-pricing](https://infisical.com/blog/hashicorp-vault-pricing) (confirmed end-of-sale June 30, 2025; EOL July 1, 2026)
- HCP Vault Dedicated minimum cost: ~$1,152/mo per [toolradar.com/tools/vault/pricing](https://toolradar.com/tools/vault/pricing)
- 1Password Business pricing and service accounts: [developer.1password.com/docs/service-accounts/](https://developer.1password.com/docs/service-accounts/) — service accounts included in Business tier
- 1Password Business pricing: $7.99/user/mo annually per [1password.com/pricing/password-manager](https://1password.com/pricing/password-manager)
- Doppler pricing (Developer free, Team $21/user/mo): [doppler.com/pricing](https://www.doppler.com/pricing) — 3-day audit log on free tier, 90-day on Team
- SOPS audit log (optional Postgres): [getsops.io/docs/](https://getsops.io/docs/)
- SOPS + age guide: [devops.datenkollektiv.de/using-sops-with-age-and-git-like-a-pro](https://devops.datenkollektiv.de/using-sops-with-age-and-git-like-a-pro.html)
- Vaultwarden Secrets Manager limitation: [github.com/dani-garcia/vaultwarden/discussions/3368](https://github.com/dani-garcia/vaultwarden/discussions/3368)
- YubiKey + Ed25519 SSH guide: [drduh YubiKey-Guide](https://github.com/drduh/YubiKey-Guide)
