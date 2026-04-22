---
title: "HashiCorp Free-Tier Vault Options: Research Memo"
date: 2026-04-22
status: DRAFT — for CEO review
author: LIMITLESS Infra Architect
---

# HashiCorp Free-Tier Vault Options: Research Memo

**Purpose:** Second-pass research focused exclusively on HashiCorp free offerings, for side-by-side comparison with the prior memo's Infisical + SOPS recommendation. Covers HCP Vault Secrets (Free) and Vault Community Edition only.

---

## ⚠️ Critical Finding: HCP Vault Secrets Is a Dead Product

Before any analysis: **HCP Vault Secrets is End-of-Sale and approaching End-of-Life.**

- **End of Sale: June 30, 2025** — no new customers can sign up.
- **End of Life: July 1, 2026** (or earlier Flex contract expiry) — all applications deleted, support ends.

The CEO-provided reference URL (`/hcp/docs/vault-secrets/get-started/plan-implementation/tiers-features`) still resolves, but the product is in terminal wind-down. HashiCorp's official migration paths are HCP Vault Dedicated (managed, paid) or Vault Community Edition (self-hosted, free). Any architecture decision based on HCP Vault Secrets Free would carry an 8-week migration deadline.[^1]

---

## Executive Summary

Neither HashiCorp free offering is a strong fit for LIMITLESS Phase 2. HCP Vault Secrets is EOL and therefore disqualified. Vault Community Edition is genuinely powerful — all major dynamic secrets engines and auth methods are free — but the operational burden of a correctly-configured production deployment (3-node minimum, cloud KMS auto-unseal, manual upgrade procedures) is disproportionate for a team of 1 CEO + 1 human + 5 Architects. Critically, HashiCorp's own published "agentic runtime security" validated pattern explicitly requires Vault Enterprise or HCP Vault Dedicated for the compelling OAuth 2.0 On-Behalf-Of agent attribution chain that would accelerate DR-001 Phase 3; the free-tier primitives exist but the polished governance story does not. The prior memo's Infisical + SOPS recommendation remains the stronger Phase 2 choice unless the CEO is prepared to maintain a 3-node Vault cluster long-term. **Recommended: do not adopt HashiCorp free tier. Proceed with Infisical + SOPS as proposed.**

---

## 1. HCP Vault Secrets Free Tier — Feature Set

*Moot for new adoption (EOL). Documented here for completeness and diff.*

### Limits

| Resource | Free | Essentials | Standard |
|---|---|---|---|
| Applications | 25 | 1,000 | 10,000 |
| Static secrets | 25 | 2,500 | 25,000 |
| Dynamic secrets | **None** | **None** | 5,000 |
| Auto-rotating secrets | **None** | **None** | 5,000 |
| Secret versions | 5 | 50 | 50 |
| Secret sync destinations | 5 | 200 | 2,000 |

Dynamic secrets and auto-rotation are Standard tier (paid) only. The free tier is static key-value only.[^2]

### Machine Identity / Universal Auth

Not surfaced as a named feature in HVS documentation. AppRole and JWT/OIDC are Vault Community concepts. HVS has its own simpler secrets-access API but no machine-identity framework equivalent to Vault's auth method system.

### Data Residency

No EU data residency option is documented for HVS. The product's replacement (HCP Vault Dedicated) explicitly supports EU AWS/Azure regions. HVS almost certainly operates US-only, which creates a GDPR/MiFID II surface for any MYTHOS secrets.[^3]

### Audit Retention

UI-level audit viewer only; no structured audit stream. Log streaming to an external system is possible but not documented with retention guarantees. This is below MiFID II requirements.

### Verdict on HCP Vault Secrets Free

**Disqualified.** EOL by July 1, 2026. Dynamic secrets absent on free tier. No EU data residency. Audit trail below compliance threshold. Do not adopt.

---

## 2. Vault Community Edition — Feature Set

### What You Get (Free, Self-Hosted)

Vault Community is substantially capable:

- **Static secrets** — KV v1/v2 with versioning (unlimited)
- **Dynamic secrets engines** — all major engines are free:
  - Databases: PostgreSQL, MySQL, MongoDB, Redis, Snowflake, Cassandra, Oracle, and more
  - Cloud: AWS, Azure, GCP
  - PKI — short-lived TLS certificates
  - SSH — signed certificates / OTPs
  - Kubernetes — service account tokens
- **Auth methods** — AppRole, JWT/OIDC, Kubernetes, TLS Certificates, AWS, Azure, GCP, LDAP, GitHub, Okta, Kerberos, and more; all free[^4]
- **Audit backends** — file, syslog, socket; all free
- **Cloud KMS auto-unseal** — AWS KMS, Azure Key Vault, GCP Cloud KMS (free in CE; HSM/PKCS11 is Enterprise-only)
- **Integrated Raft storage** — no external Consul dependency required
- **Encryption-as-a-service (Transit engine)** — free

### What Is Enterprise-Only (Not Free)

The following are paywalled and relevant to LIMITLESS:

| Feature | Why It Matters |
|---|---|
| **Namespaces** | Multi-tenancy isolation between LIMITLESS and MYTHOS workloads on a shared cluster |
| **Sentinel policies** | Policy-as-code for fine-grained agent-level access control |
| **Control groups** | Approval workflows before agent accesses high-risk secrets |
| **DR replication** | Cross-node data redundancy beyond Raft quorum |
| **Performance replication** | Read-scaling across clusters |
| **Secrets Sync** | Syncing to GitHub Actions secrets, Vercel, AWS Secrets Manager, etc. |
| **Autopilot automated upgrades** | Cluster upgrades without downtime |
| **SAML auth** | SSO federation |
| **OAuth 2.0 On-Behalf-Of delegation** | The full agent attribution pattern (see §4) |[^5]

### (D) Ops Burden at LIMITLESS Team Size

This is where Vault Community Edition loses the argument for Phase 2.

**Dev-mode: do not use in production.** HashiCorp's own documentation: *"Never, ever, ever run a 'dev' mode server in production. It is insecure and will lose data on every restart."* Dev-mode uses in-memory storage, no TLS, auto-unseals with a known root token. It is a local experimentation tool only.[^6]

**Single-node non-dev (Raft, file storage):** Technically runs. But with zero quorum tolerance: any node downtime = complete service outage until manual restart and unseal. Disk corruption = permanent data loss. HashiCorp formally recommends 5 nodes across 3 availability zones for production.[^7]

**Minimum resilient configuration:** 3 nodes (tolerates 1 failure). On Hetzner, 3 × CX21 (2 vCPU, 4 GB, €10.90/month each) = **€32.70/month infrastructure cost**. This requires:

- Systemd unit files on each node
- Raft peer bootstrapping (one-time ceremony, easy to get wrong)
- Cloud KMS auto-unseal configured (requires AWS/GCP/Azure KMS — adds vendor dependency)
- Manual rolling upgrade procedure when Vault releases security patches (Autopilot is Enterprise-only)
- Recovery key ceremony documented and stored securely
- Monitoring: if Vault seals unexpectedly (KMS unavailable, node crash), agent containers that need dynamic credentials will fail immediately — no graceful degradation

**Honest assessment:** For a team of 1 CEO + 1 human + 5 Architects where the human operator is not a full-time infrastructure engineer, a 3-node Vault cluster is a maintenance liability. Every Vault minor version (released roughly every 6–8 weeks) needs a manual rolling upgrade. Auto-unseal depends on an external KMS being available — if KMS has an outage, Vault seals and all secret-dependent workloads stop. The blast radius of a misconfigured unseal far exceeds any risk from Infisical's managed SaaS model.

A single-node Vault is viable for non-critical dev/staging use and is acceptable as a bootstrap if the team accepts a documented SLA of "no HA, downtime during upgrades, manual unseal recovery." It is not a credible production secrets backend for a trading platform with MiFID II audit requirements.

---

## 3. Agentic Runtime Security — Free vs Enterprise-Gated

HashiCorp's agentic runtime security narrative centers on dynamic credential issuance, short-lived tokens, and AI agent attribution. Let us be precise about what each tier provides.

### What Is Actually Free in Vault Community Edition

| Capability | Free? |
|---|---|
| Dynamic credential issuance per agent invocation (AppRole → DB/cloud engine) | **Yes** |
| Short-lived tokens with TTL tied to container lifetime | **Yes** |
| Lease revocation on container exit (explicit API call or TTL expiry) | **Yes** |
| Audit log of every API request/response | **Yes** (file/syslog/socket) |
| AppRole auth for NanoClaw container-runner | **Yes** |
| JWT/OIDC auth (e.g., Kubernetes service account token) | **Yes** |

These primitives are real and meaningful. An Architect container could authenticate via AppRole at spawn time, receive a Vault token with a 30-minute TTL, use it to fetch database credentials and API keys, and those credentials would expire automatically when the token expires. This pattern works in Community Edition with no paywalling.

### What Is Enterprise-Gated (The Compelling Parts of the Narrative)

The HashiCorp validated pattern document for AI agent identity is explicit:[^8]

> "This enables organizations to securely integrate AI agents with **HashiCorp Vault Enterprise** (or **HCP Vault Dedicated**)."

Specifically, the following are Enterprise/HCP Dedicated only:

- **OAuth 2.0 token exchange + On-Behalf-Of delegation** — the mechanism that attributess an AI agent's secret access to the human who authorized the agent's session. This is the MiFID II-relevant audit chain for MYTHOS.
- **Namespaces** — needed to isolate LIMITLESS and MYTHOS credential domains on a shared cluster.
- **Sentinel policies** — to enforce per-agent-role access policy beyond basic ACL.
- **Control groups** — to require human approval before an agent accesses safety-critical secrets.

**IBM SLM (Security Lifecycle Management)** is a paid contract SaaS product (12/24/36-month contracts on AWS Marketplace, pricing starts at $260/year for basic instances). It is not a free offering and is not relevant to the free-tier analysis.[^9]

**HashiConf 2025 agentic features** (Vault Radar MCP server, project infragraph, Jira scanning) are HCP-only, currently in beta, and paid.[^10]

### Assessment for DR-001 Phase 3

DR-001 Phase 3 requires container-runner to generate GitHub App installation tokens at spawn time. Vault Community Edition could front this: container-runner authenticates to Vault via AppRole, Vault's GitHub dynamic secrets engine issues a per-session GitHub token. This is technically viable in Community Edition.

However, the full attribution chain (agent session → human authorizer → GitHub commit → audit record) that DR-001 Phase 3 ultimately targets is richer than what Community Edition supports. The OAuth 2.0 On-Behalf-Of pattern that HashiCorp's validated design uses for this is Enterprise-only. Community Edition gets you credential issuance and TTL-bounded tokens; it does not get you delegated-identity audit trails out of the box.

**Verdict:** Vault Community Edition accelerates DR-001 Phase 3 at the infrastructure layer (dynamic credential issuance) but does not close the agent attribution gap without Enterprise. Infisical does not either — this gap is a Vault Enterprise upsell regardless of which secrets manager is chosen.

---

## 4. Fit with Phase 2 Readiness and MYTHOS

### Q1 — Signed Commits

Vault has no direct bearing on commit signing. Q1 is closed by the VPS-1 SSH signing key setup (separate parallel task, 2026-04-22).

### Q2–Q5 — Agent Identity, Review Flow, Safety Gates

Vault Community Edition does not materially change the Q2–Q5 picture. These decisions are governance questions (CODEOWNERS, DR-001 GitHub App rollout) rather than secrets-management questions.

### DR-001 Phase 3 Acceleration

As noted above: partial acceleration (dynamic credential issuance is easier with Vault than with Infisical's static secrets model), but the compelling attribution features are Enterprise-gated.

### DR-002

No impact. DR-002 is about NanoClaw deployment pipeline, not secrets management.

### MYTHOS MiFID II Posture

The MiFID II-relevant requirements are: (a) audit trail of secret access tied to authorized human identity, (b) EU data residency, (c) retention ≥ 5 years, (d) tamper-evidence.

| Requirement | Vault Community (Free) | Infisical (Proposed) |
|---|---|---|
| Audit trail of secret access | Yes (file/syslog) | Yes (audit logs, paid for advanced) |
| EU data residency | Self-hosted: yes, you choose the DC | Cloud: EU region available; Self-hosted: yes |
| EU data residency (managed) | No managed option at $0 | Infisical Cloud EU region (paid) |
| Retention ≥ 5 years | You manage your audit log storage | You manage your audit log forwarding |
| Tamper-evident logs | Not built-in (use immutable storage) | Not built-in |
| OAuth 2.0 On-Behalf-Of (agent attribution) | **Enterprise only** | **Not supported** |

Neither option natively provides the full MiFID II audit chain for AI agent access at the free tier. Both require forwarding audit logs to an immutable store (S3 + Object Lock, or equivalent) as a separate step. The Vault Community advantage for MYTHOS is that it is self-hosted on Hetzner Frankfurt, putting data residency fully in control — but Infisical Cloud's EU region achieves the same at lower ops burden.

---

## 5. Side-by-Side Diff Against Prior Memo (Infisical + SOPS)

*Note: The prior memo (`docs/superpowers/specs/2026-04-22-secrets-backup-and-vault-strategy.md`) was not present on `origin/main` at the time of this writing. This diff is written against the expected recommendation structure.*

| Dimension | Infisical + SOPS (Prior Recommendation) | Vault Community (Free) | HCP Vault Secrets Free |
|---|---|---|---|
| **Dynamic secrets** | No — static only | Yes — all major engines | No — Standard tier only |
| **Free tier viability** | Yes (Infisical OSS or free cloud) | Yes (OSS, self-hosted) | **DEAD (EOL July 2026)** |
| **Ops burden** | Low (Infisical OSS single-node or Cloud) | High (3-node min for HA) | N/A |
| **EU data residency** | Self-hosted: yes; Cloud EU: paid | Self-hosted: yes | Not documented |
| **MiFID II audit** | Audit logs available; external retention needed | Audit logs (file/syslog); external retention needed | Insufficient |
| **Agent identity (DR-001 Ph3)** | Partial (secret delivery, not attribution) | Partial (dynamic creds; attribution is Enterprise) | No |
| **Git/file-based secrets (SOPS)** | Yes — SOPS handles encrypted secrets in git | Not applicable (Vault is a server, not git-native) | Not applicable |
| **Setup complexity for team size** | Low | High | N/A |
| **Licensing risk** | Low (BSL; Infisical OSS still usable) | Low (MPL 2.0) | High (product EOL) |
| **Where Vault Community wins** | — | Dynamic DB/cloud credential issuance at $0 | — |
| **Where Infisical + SOPS wins** | Git-native secrets, low ops burden, simpler mental model | — | — |

**Convergence:** Both Infisical and Vault Community provide audit logs requiring external retention for MiFID II compliance. Neither provides agent attribution at the free tier (Enterprise-gated). Both work on Hetzner Frankfurt for EU data residency via self-hosting.

**HashiCorp wins when:** the team needs dynamic database credential rotation (new credentials per agent session, auto-expired) and is willing to operate a 3-node cluster. This is a legitimate use case but premature for Phase 2 when static secrets + SOPS covers the near-term need.

**Infisical + SOPS wins when:** ops simplicity and git-native workflow integration are priorities. SOPS-encrypted secrets in the monorepo are auditable via git history, reviewable in PRs, and require zero server infrastructure. Infisical Cloud adds a UI and team access controls at low cost if needed.

---

## 6. Options Table

| Option | Licensing Cost | Infra Cost | Ops Complexity | Dynamic Secrets | MiFID II Ready |
|---|---|---|---|---|---|
| HCP Vault Secrets Free | $0 | $0 | Low | No | No (and EOL) |
| Vault Community, single-node | $0 | ~€11/month (1× CX21) | Medium | Yes | Partial (no HA, manual unseal) |
| Vault Community, 3-node HA | $0 | ~€33/month (3× CX21) | High | Yes | Partial (self-manage audit retention) |
| Infisical OSS, single-node | $0 | ~€11/month | Low | No | Partial |
| Infisical + SOPS (recommended) | $0 | ~€11/month (if self-hosted) | Low | No | Partial (git audit via commits) |
| Vault Enterprise / HCP Dedicated | $25k+/yr | $0–€33/month | Medium | Yes | Yes (agent attribution, namespaces) |

All "$0 licensing" options require external audit log retention infrastructure for MiFID II compliance.

---

## 7. Open Questions / CEO Decisions Required

1. **Is dynamic credential rotation a Phase 2 requirement?** If yes, Vault Community is the only free path. If Phase 2 only needs secret delivery and rotation is a Phase 3 concern, Infisical + SOPS remains sufficient.

2. **Is the team prepared to operate a 3-node Vault cluster?** This is the honest gate question. A single-node Vault is a staging tool. Three nodes means a recurring ops obligation: rolling upgrades every 6–8 weeks, KMS dependency, manual unseal recovery runbook, monitoring.

3. **Prior memo location:** `docs/superpowers/specs/2026-04-22-secrets-backup-and-vault-strategy.md` did not exist on `origin/main` at writing time. CEO should confirm whether the prior memo was written in a local draft not yet pushed, or if the filename differs. This memo cannot diff against it if it doesn't exist in the repo.

4. **HCP Vault Secrets EOL acknowledgement:** The CEO-provided tiers reference URL is valid but the product is dead. CEO should confirm this was not already known and factor it into the decision.

5. **MYTHOS data residency decision:** If MYTHOS secrets must reside in EU (Frankfurt) from day 1 for MiFID II, both Infisical self-hosted on Hetzner Frankfurt and Vault Community on Hetzner Frankfurt satisfy this. Infisical Cloud's EU region is a paid option if managed SaaS is preferred.

---

## 8. Recommended Next Steps

1. **Proceed with Infisical + SOPS** as recommended in the prior memo. The Phase 2 requirements do not justify the operational overhead of a Vault cluster.
2. **Park Vault Community Edition** as a Phase 3/4 option for dynamic database credentials, specifically if MYTHOS's trading engine needs per-session rotating PostgreSQL credentials. File a DR at that point.
3. **Do not evaluate HCP Vault Secrets** further. EOL July 1, 2026.
4. **File DR-003 (Secrets Management)** once CEO reviews both memos and selects a direction. This closes Q1's dependency surface and unblocks the VPS `.env` rotation process.

---

## Footnotes

[^1]: [HCP Vault Secrets End Of Life — HashiCorp Support](https://support.hashicorp.com/hc/en-us/articles/41802449287955-HCP-Vault-Secrets-End-Of-Life)
[^2]: [HCP Vault Secrets Tiers and Features](https://developer.hashicorp.com/hcp/docs/vault-secrets/get-started/plan-implementation/tiers-features)
[^3]: [HCP Vault Secrets Constraints and Known Issues](https://developer.hashicorp.com/hcp/docs/vault-secrets/constraints-and-known-issues)
[^4]: [Vault Auth Methods](https://developer.hashicorp.com/vault/docs/auth)
[^5]: [Vault Enterprise Features](https://developer.hashicorp.com/vault/docs/enterprise)
[^6]: [Vault Dev Server Concepts](https://developer.hashicorp.com/vault/docs/concepts/dev-server)
[^7]: [Vault Raft Reference Architecture](https://developer.hashicorp.com/vault/tutorials/day-one-raft/raft-reference-architecture)
[^8]: [Vault AI Agent Identity Validated Pattern](https://developer.hashicorp.com/validated-patterns/vault/ai-agent-identity-with-hashicorp-vault)
[^9]: [IBM HashiCorp SLM on AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-evinatdczq7ye)
[^10]: [HashiConf 2025 — Project Infragraph Announcement](https://newsroom.ibm.com/2025-09-25-hashicorp-previews-the-future-of-agentic-infrastructure-automation-with-project-infragraph)

---

*Authored-by-agent: LIMITLESS Infra Architect (governance spec §4.1)*
