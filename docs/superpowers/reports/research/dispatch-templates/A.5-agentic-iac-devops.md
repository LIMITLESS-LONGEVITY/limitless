# Dispatch A.5 — Agentic IaC + DevOps Automation

**Read `00-COMMON-CONTEXT.md` first.** Output file: `docs/superpowers/reports/research/A.5-agentic-iac-devops-2026-04-27.md`

## Players in scope (4)

1. **HashiCorp Terraform AI** — current state of HashiCorp's AI-assisted Terraform offerings (Terraform Cloud / Enterprise integrations)
2. **Pulumi AI** — current Pulumi enterprise AI capabilities
3. **Spacelift Stacks AI** — Spacelift's AI-assisted IaC governance + agentic features
4. **AWS Q Developer (IaC mode)** — Q Developer specifically as it applies to CloudFormation / CDK / IaC workflows

## Out of scope (don't drift into these)

- Argo + AI controllers (too immature; community-driven, not vendor-productized)
- GitHub Actions agentic extensions (already covered tangentially in A.3)
- Datadog / New Relic AI-Ops (observability, different category)
- AWS CodeWhisperer for general code (handled in A.2 if at all)
- Backstage AI plugins (developer-portal scope, not IaC)

## Capability axes (your matrix columns)

1. **Tool / language coverage** — Terraform / Pulumi / CloudFormation / CDK / Crossplane / multi
2. **AI assistance level** — autocomplete / propose-diff / propose-with-validation / auto-apply
3. **Drift detection + correction** — manual / detection-only / detection + propose / detection + auto-correct
4. **Policy / compliance enforcement** — manual / policy-as-code (OPA, Sentinel, etc.) / AI-policy-suggestions
5. **Multi-cloud** — single / multi / hybrid-on-prem
6. **CI/CD integration** — built-in / external (GH Actions, GitLab CI) / both
7. **Pricing model** — per-resource / per-run / per-seat / enterprise quote
8. **Enterprise governance** — RBAC / audit / SSO / FedRAMP
9. **Maturity signal** — preview / GA / wide enterprise adoption

## Implications-for-our-platform questions to address in §4

- Our infra/Terraform pattern (chmod735-dor/infra-code repo, Ansible roles, Hetzner provider) is currently human-driven with AI assistance. What would full-agentic look like for us, and which competitor's approach maps best?
- Drift detection: do any of these solve the "VPS-1 manual changes vs Terraform truth" problem we hit during 2026-04-26 rebuild?
- Policy-as-code: should our platform expose policy hooks similar to Spacelift+OPA?
- Multi-cloud: we're currently Hetzner+AWS-decom. What's the multi-cloud-from-day-1 cost vs benefit per these competitors?

## Sizing

4 players × ~9 axes + per-player notes + 4 implications + open questions + citations. Target output file: 600-1200 lines, ~4-8 KB.
