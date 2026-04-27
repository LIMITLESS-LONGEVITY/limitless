---
dispatch_id: A.5
topic: Agentic IaC + DevOps Automation
authored_by: LIMITLESS Infra Architect
date: 2026-04-27
context_anchor: project_meta_pivot_machine_that_builds_machines.md
players_count: 4
---

## 1. Players surveyed

1. **HashiCorp Terraform AI (Terraform Cloud / HCP Terraform)**
   - Vendor: HashiCorp (now an **IBM company** post-acquisition; deal closed **2026-02-27** for $6.4B) [1][2]
   - Version: Terraform 1.x GA; HCP Terraform tiers Free / Standard / Plus / Premium; **Project Infragraph** + **watsonx integration** is the new joint AI roadmap; AI-assisted module generation in HCP Terraform; **drift detection is notification-only** at the Plus tier [3][4]
   - URL: https://www.hashicorp.com/products/terraform / https://developer.hashicorp.com/terraform
   - Evidence basis: HashiCorp/IBM merger announcements, HashiCorp blog on watsonx integration, HCP Terraform pricing + features pages, HashiCorp HCP Terraform drift-detection docs. No firsthand integration in this codebase.

2. **Pulumi AI / Pulumi Neo**
   - Vendor: Pulumi Corporation
   - Version: Pulumi AI Copilot (the original 2023-era assistant) has **been rebranded and superseded by Pulumi Neo** (autonomous infra agent); pricing tiers Team / Enterprise ($400/mo) / Business / Self-hosted; Neo's autonomy is **three-mode (Review / Balanced / Auto)** with PR-based remediation [5][6]
   - URL: https://www.pulumi.com / https://www.pulumi.com/product/pulumi-neo/
   - Evidence basis: Pulumi product pages (Neo), Pulumi blog "Introducing Pulumi Neo," Pulumi pricing page, customer case study on HITRUST (30,000 violations, ~20% auto-resolved in weeks). No firsthand use.

3. **Spacelift Stacks AI / Spacelift Intent**
   - Vendor: Spacelift Inc.
   - Version: Spacelift's Stacks AI assistant (in-product copilot + MCP server); **Spacelift Intent** is a separate, **open-source, codeless agentic IaC** offering — provisions cloud resources directly via cloud APIs from natural-language intent, no HCL/Terraform required; OPA/Rego policy engine [7][8]
   - URL: https://spacelift.io / https://github.com/spacelift-io/intent
   - Evidence basis: Spacelift product pages, Spacelift blog "Introducing Intent," GitHub repo for spacelift-io/intent, OPA/Rego policy docs. No firsthand use.

4. **AWS Q Developer (IaC mode + Agent Plugins for AWS)**
   - Vendor: Amazon Web Services
   - Version: Q Developer Pro tier $19/user/mo; Free tier; **Agent Plugins for AWS** released **Feb 2026** lets external agents (Claude Code, Cursor) invoke AWS deploys via the official **AWS IaC MCP Server**; covers CloudFormation + CDK + (limited) Terraform; SOC/ISO/HIPAA/PCI compliance; FedRAMP coverage **not explicitly named** for Q Developer (AWS general FedRAMP applies to underlying services) [9][10]
   - URL: https://aws.amazon.com/q/developer/ / https://github.com/awslabs/aws-iac-mcp-server
   - Evidence basis: AWS Q Developer launch + pricing pages, AWS What's New "Agent Plugins for AWS" announcement, awslabs/aws-iac-mcp-server GitHub, AWS Trust Center compliance pages. No firsthand use.

> **Bucket-fit note**: All four legitimately fit the "agentic IaC + DevOps" definition. The bucket bifurcates into (a) **assistive** copilots that propose IaC/HCL/CDK code (Terraform AI, AWS Q Developer baseline, Spacelift Stacks AI) and (b) **autonomous** agents that take action on infra state (Pulumi Neo, Spacelift Intent, Q Developer + Agent Plugins). D.1 may want to call out this split.

## 2. Capabilities matrix

`?` = insufficient public evidence. Citation tokens reference §6.

| Axis | Terraform AI (HCP) | Pulumi AI / Neo | Spacelift Stacks AI / Intent | AWS Q Developer (IaC) |
|---|---|---|---|---|
| **Tool / language coverage** | **Terraform / HCL only**; provider-agnostic via Registry; multi-cloud through providers [3] | **Python / TypeScript / Go / C# / Java / YAML**; multi-cloud via Pulumi providers; full general-purpose-language IaC [5] | Stacks AI: **Terraform, OpenTofu, Pulumi, CloudFormation, Kubernetes** runners; Intent: **codeless** — natural-language intent compiled directly to cloud-API calls (no HCL) [7][8] | **CloudFormation + CDK (TypeScript / Python / Java / C#)** primary; limited Terraform; AWS-only [9] |
| **AI assistance level** | suggest + propose-with-diff; **module generation in HCP Terraform**; watsonx integration adds Project Infragraph dependency-graph reasoning post-IBM [1][4] | Neo: **three-mode autonomy**: Review (HITL on every change), Balanced (HITL on risky changes), Auto (full autonomy with policy gating); fixes via **PRs**, not direct apply [5][6] | Stacks AI: in-IDE copilot + MCP server (assistive). Intent: **most aggressive autonomy in the IaC space** — natural-language → provisioned infra with no human-readable IaC artifact in the loop [7][8] | Suggest + propose-with-diff in IDE; **Agent Plugins for AWS (Feb 2026)** lets external Claude Code / Cursor invoke deploys via MCP; auto-execute behind explicit approval gates [9][10] |
| **Drift detection + correction** | **notification-only** drift detection in HCP Plus tier; correction is human-driven via plan/apply [3] | **drift detection + auto-remediation** in Business / Enterprise tiers; Neo opens PRs to reconcile or auto-applies in Auto mode (HITRUST customer: 30K violations, ~20% closed in weeks) [5][6] | Stacks: drift detection on managed stacks; Intent: continuous reconciliation via cloud-API polling [7][8] | drift via AWS Config / CloudFormation drift; Q Developer surfaces drift but remediation flows through CloudFormation stack updates (human-approved unless wired through Agent Plugins) [9] |
| **Policy / compliance enforcement** | **Sentinel** (HashiCorp's policy-as-code) + **OPA** support in HCP Terraform; pre-apply enforcement [3] | **CrossGuard** (Pulumi's policy-as-code, Python/TS); Neo gates Auto-mode on CrossGuard verdicts [5] | **OPA / Rego** native; Intent compiles natural-language policies to OPA — the most novel pattern: NL-to-policy as a primitive [7][8] | **CloudFormation Guard / cfn-guard** + IAM Access Analyzer + Service Control Policies; Q-driven generation respects org SCPs [9] |
| **Multi-cloud** | yes via providers (AWS, Azure, GCP, OCI, Hetzner, etc.) [3] | yes; Pulumi's general-purpose-language model makes multi-cloud composition more natural than HCL [5] | yes; Intent supports AWS, Azure, GCP, Kubernetes [7][8] | **AWS-only** by design [9] |
| **CI/CD integration** | HCP Terraform run pipelines + GitHub/GitLab/Bitbucket VCS triggers; webhook-driven; Run Tasks for external policy/cost tooling [3] | Pulumi Deployments service + GitHub Actions + Pulumi ESC for env config; Neo runs as a service that authors PRs into the user's CI [5][6] | Spacelift is itself a CI for IaC; runner-based; **drift detection schedules + worker pools**; Intent invocable from CLI / API / git triggers [7][8] | Q Developer plugs into GitHub Actions / CodeCatalyst / native AWS pipelines; Agent Plugins for AWS exposes deploy as an MCP tool [9][10] |
| **Pricing** | HCP Terraform Free / Standard $0.00014/resource-hour / Plus $0.00014 + drift / Premium quote-based [3] | Team free for ≤200 resources; **Enterprise $400/mo**; Business + Self-hosted quote-based; Neo bundled into Business+ [5] | Spacelift Cloud paid; **Intent is open-source / free** [8] | **Q Developer Pro $19/user/mo**; Free tier; usage-based for Agent Plugins [9] |
| **Enterprise governance** | SOC 2 / ISO 27001; SAML SSO; private module registry; audit logs; HCP Terraform on dedicated VPC for Premium; **post-IBM watsonx adds IBM enterprise compliance umbrella** [1][3] | SOC 2 Type II / ISO 27001 / HIPAA-eligible (Business+); SSO/SAML; OIDC for cloud creds; **self-hosted option** for air-gapped/on-prem; audit logs [5] | SOC 2 / ISO 27001 / GDPR; SSO/SAML; private workers (self-hosted runner) for VPC infra; **Intent is self-hostable as OSS** [7][8] | AWS shared-responsibility umbrella: SOC 1/2/3, ISO 27001/27017/27018, HIPAA-eligible, PCI DSS, IRAP; IAM Identity Center SSO; **FedRAMP not explicitly named for Q Developer at GA** (gaps documented in AWS compliance notes) [9] |
| **Maturity** | Terraform itself: production mission-critical, hyperscale; AI-assisted module generation: **GA but conservative**; watsonx-integrated agentic features: **early/announced** post-IBM [1][3][4] | Pulumi: GA mature; Neo: **GA, autonomy modes are differentiated (rare in IaC space)**; production HITRUST customer evidence [5][6] | Stacks AI: GA; **Intent: open-source preview** — most novel design but least battle-tested [7][8] | Q Developer GA; **Agent Plugins for AWS (Feb 2026)**: GA, recent — adoption curve early [9][10] |

## 3. Per-player notes

### HashiCorp Terraform AI (post-IBM)
- HashiCorp now an IBM company (deal closed **2026-02-27**, $6.4B) [1][2]. The strategic implication: Terraform's AI roadmap is now a watsonx-integrated roadmap — **Project Infragraph** is the joint initiative pairing Terraform's resource graph with watsonx's agent reasoning, branded as **"Self-Healing Infrastructure"** in HashiCorp comms [1][4].
- Native AI assistance is conservative — **module generation + diagnostics**, with drift detection at notification-only. The agentic-execution story sits in Project Infragraph (announced) rather than HCP Terraform GA features (today) [3][4].
- Sentinel + OPA are the two policy engines. Sentinel is HashiCorp-proprietary; OPA is the multi-vendor lingua franca and lets HCP Terraform inter-operate with Spacelift / Pulumi / Styra policy stacks [3].
- For our platform: Terraform itself remains the **dominant declarative substrate** (especially with our Hetzner provider usage in `chmod735-dor/infra-code`). The AI layer is the part to watch as Project Infragraph matures, not buy today.

### Pulumi AI / Pulumi Neo
- Pulumi Neo is the headline 2026 product: **autonomous infrastructure agent with three named autonomy modes (Review / Balanced / Auto)** [5][6]. This is the **clearest enterprise-grade autonomy taxonomy** in the IaC market and maps cleanly onto our DR-003 ratification framing.
- Remediation is **PR-based** in Review and Balanced modes (Neo writes PRs into the customer's repo); Auto mode applies after CrossGuard policy verdict. This is the safer pattern for our governance: **autonomy gated by policy, surfaced as PRs**, no silent infra changes [5][6].
- HITRUST customer case study reports: Neo identified **30,000 policy violations**, auto-resolved **~20% in weeks** [6]. This is one of the few real production-scale numbers for autonomous IaC remediation in 2026.
- General-purpose-language IaC (Python / TS / Go / C# / Java) makes agentic generation easier than HCL — the LLM is generating in a language with a real type system, package ecosystem, and IDE tooling. Worth noting for our preference: **LLMs generate Python better than HCL**.

### Spacelift Stacks AI / Spacelift Intent
- Two distinct products under one roof: (a) **Stacks AI**, the assistive copilot inside the existing Spacelift product (managed Terraform/OpenTofu/Pulumi/CloudFormation/Kubernetes runners); (b) **Spacelift Intent**, an **open-source, codeless agentic IaC** project that takes natural-language intent and provisions cloud resources via cloud APIs without producing any HCL artifact [7][8].
- **Intent is the most aggressive autonomy design in the IaC space**: there is no human-readable IaC source-of-truth — the intent itself *is* the source. This is novel and risky. For us, the relevant lesson is the **NL-to-OPA-policy compilation pattern** — translating natural-language policy into Rego is something our platform's policy hooks could adopt, even if we keep HCL as the substrate [7][8].
- Stacks AI's **MCP server** is well-aligned with the 2026 protocol direction; lets external coding agents (Claude Code, Cursor) submit Spacelift runs as a tool [7].

### AWS Q Developer (IaC mode + Agent Plugins for AWS)
- Q Developer Pro at **$19/user/mo** is positioned as the lowest-friction enterprise IDE-side IaC copilot; AWS-only by design, no multi-cloud aspirations [9].
- The strategic 2026 move is **Agent Plugins for AWS (Feb 2026)** — exposes AWS deploy/IaC capabilities to external agents (Claude Code, Cursor, custom) via the **AWS IaC MCP Server**. This is the clearest signal that hyperscalers see MCP as the integration substrate they need to support, not compete with [10].
- Compliance umbrella inherits AWS's standard certifications (SOC, ISO, HIPAA, PCI, IRAP). **FedRAMP is *not explicitly named* for Q Developer at GA** [9] — buyers in fed/regulated workloads should verify on the AWS Trust Center before assuming coverage.
- **Pattern to adopt:** the AWS Agent Plugins for AWS architecture — *infrastructure is exposed as MCP tools that external agents call* — is precisely the pattern our Architect should adopt to deploy into our Hetzner/Ansible substrate. Wrap our deploy primitives as MCP tools, then any agent (ours or external) can invoke them with the same governance.

## 4. Implications for our platform

**Q1: How should we ratify autonomy on infra changes?**
Pulumi Neo's **three-mode taxonomy (Review / Balanced / Auto) gated by CrossGuard policy** is the clearest production-grade pattern in the IaC space and **maps directly onto DR-003's per-action ratification axis**. Recommendation: adopt the same naming and the same "PR-as-the-default-output" pattern. Auto mode should require explicit policy verdict + bot-feedback-loop guard before any direct apply. The PR-#82 incident (2026-04-22) is exactly the failure mode that PR-based remediation prevents.

**Q2: Drift detection — what should we build vs buy for our Hetzner/Ansible substrate?**
The 2026-04-26 VPS-1 rebuild surfaced our exact gap: manual changes drift from Terraform truth, and Terraform Cloud only *notifies*, doesn't reconcile. Pulumi Neo's auto-remediating drift loop is the right architectural target for our platform — **detect drift, open PR, gate on policy, apply**. We don't need to buy Pulumi to get this; we need to build the equivalent loop using Terraform plan output + our existing Architect-spawning pattern. **Action item: drift-detection cron → architect spawn → reconciliation PR** is the smallest viable autonomous-remediation loop.

**Q3: Policy as code — adopt OPA, Sentinel, both, or NL-to-policy?**
**OPA/Rego is the multi-vendor consensus** (HCP Terraform, Spacelift, Pulumi all support it). Sentinel is HashiCorp-proprietary and now IBM-stewarded — risky single-vendor lock-in. Spacelift Intent's **NL-to-OPA compilation** is the novel pattern worth borrowing for our policy-hook UX, even if we keep OPA as the runtime substrate. Recommendation: **OPA as policy runtime; NL-to-OPA as authoring UX**.

**Q4: MCP as deploy substrate?**
AWS's Feb 2026 Agent Plugins for AWS launch confirms hyperscalers are standardizing on MCP for agent-driven infra operations. **Our deploy primitives (Ansible roles, Terraform plans, Hetzner provider calls) should be wrapped as MCP tools** so any agent — ours, Claude Code directly, Cursor, future A2A peers — can invoke them with consistent governance. This is the pattern Spacelift Stacks AI also adopted. **Cross-dispatch tie-in:** A.4 surfaced MCP as orchestration table-stakes; A.5 confirms it's also IaC table-stakes. The decision is unanimous across surface areas.

## 5. Open questions for D.1 synthesis

1. **HashiCorp under IBM: roadmap-watch or buy-pause?** Project Infragraph is the announced direction but watsonx integration is early. Should D.1 recommend **pausing Terraform AI investment** until Project Infragraph delivers, or **double down on Terraform-as-substrate** because it's still the dominant declarative IaC and the AI layer can be platform-built on top?
2. **Codeless IaC (Spacelift Intent) — directional bet or anti-pattern?** Intent removes the human-readable source-of-truth, which conflicts with our **monorepo-as-source-of-truth (DR-002)** value. Is the productivity ceiling worth the legibility floor? Strongly recommend D.1 explicitly *rejects* codeless IaC for our platform, and instead adopts the NL-authoring-UX-with-HCL-output pattern.
3. **Pulumi vs Terraform substrate for our platform?** Pulumi's GP-language IaC is genuinely easier for LLMs to generate against. But our existing infra is HCL/Ansible. The cost-of-switching question is real for D.1: is there an argument for **Pulumi-on-greenfield, Terraform-on-existing**, and what does that mean for our 5-Architect fleet's tooling?
4. **FedRAMP for our potential federal customers — who covers it today?** AWS Q Developer doesn't explicitly carry FedRAMP at GA. HCP Terraform Premium has FedRAMP Moderate. Pulumi Business is HIPAA but not FedRAMP-named. **None of these are FedRAMP High.** If D.1 sees fed/IL5 in the addressable market, this is a buy-build decision with real cost implications.

## 6. Citations

[1] HashiCorp + IBM merger announcement — https://www.hashicorp.com/blog/hashicorp-joins-ibm (2026-02-27 close, $6.4B)
[2] IBM newsroom — IBM completes acquisition of HashiCorp — https://newsroom.ibm.com/2026-02-27-IBM-Completes-Acquisition-of-HashiCorp
[3] HCP Terraform pricing + drift detection docs — https://www.hashicorp.com/products/terraform/pricing and https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health
[4] HashiCorp blog — Project Infragraph + watsonx integration / "Self-Healing Infrastructure" direction
[5] Pulumi pricing + Neo product page — https://www.pulumi.com/pricing/ and https://www.pulumi.com/product/pulumi-neo/
[6] Pulumi blog — Introducing Pulumi Neo + HITRUST customer case study (30,000 violations, ~20% auto-resolved)
[7] Spacelift product page + MCP server docs — https://spacelift.io and https://docs.spacelift.io/integrations/mcp
[8] Spacelift Intent — https://github.com/spacelift-io/intent and Spacelift blog "Introducing Intent"
[9] AWS Q Developer pricing + compliance — https://aws.amazon.com/q/developer/pricing/ and AWS Trust Center compliance pages (SOC, ISO, HIPAA, PCI; FedRAMP not explicitly named for Q Developer at GA)
[10] AWS What's New — Agent Plugins for AWS (Feb 2026) + awslabs/aws-iac-mcp-server GitHub
[11] Pulumi CrossGuard policy-as-code docs — https://www.pulumi.com/docs/iac/using-pulumi/crossguard/
[12] HashiCorp Sentinel docs — https://developer.hashicorp.com/sentinel
[13] OPA / Rego project — https://www.openpolicyagent.org/
[14] AWS CloudFormation Guard / cfn-guard — https://github.com/aws-cloudformation/cloudformation-guard
[15] AWS IAM Identity Center / SSO + AWS shared-responsibility compliance umbrella — https://aws.amazon.com/compliance/
