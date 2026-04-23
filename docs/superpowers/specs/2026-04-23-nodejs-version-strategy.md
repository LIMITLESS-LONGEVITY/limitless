---
title: Node.js version strategy for the LIMITLESS division
date: 2026-04-23
status: DRAFT
author: LIMITLESS main-ops Architect
priority: P2
requested_by: CEO (via Director, per feedback_architect_review_before_ceo_decisions)
cross_refs:
  - docs/superpowers/specs/2026-04-21-agentic-sdlc-phase-2-readiness-report.md (DR-001, DR-002)
  - docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md (§5.5 verification discipline)
  - .github/workflows/ci-build.yml (CI Node pin)
  - apps/nanoclaw/container/Dockerfile (container base image)
---

## Executive recommendation

**Adopt Node.js 24 (Active LTS) across the LIMITLESS division on a staged 30-day timeline.** Node 20 reaches end of life in 7 days (2026-04-30) — this is not an optional upgrade. Node 22 entered Maintenance in October 2025 and is already one phase behind, so skipping it is the higher-leverage move. Node 24 gives us the longest support runway (Active LTS through Oct 2027, Maintenance through Apr 2028) and is Render's new default as of 2026-04-21. The upgrade is **gated on a `better-sqlite3` major-version bump (11.10 → 12.x)**, which is a known-compatible, well-trodden change. Node 25 (the "latest stable" the CEO referenced) is a Current non-LTS line with a 2026-06-01 EOL; it is not a credible production target.

---

## 1. Node release and LTS lifecycle — reality check as of 2026-04-23

Upstream Node.js maintains a two-year LTS rotation for even-numbered majors. Odd majors ship in April/October, live six months in Current, and then end. Authoritative dates from the [Node.js Release schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json):

| Major | Codename | Active LTS start | Maintenance start | End of Life | Phase today (2026-04-23) |
|-------|----------|------------------|-------------------|-------------|--------------------------|
| v18   | Hydrogen | 2022-10-25       | 2023-10-18        | **2025-04-30** | EOL (expired 12 months ago) |
| v20   | Iron     | 2023-10-24       | 2024-10-22        | **2026-04-30** | Maintenance — **EOL in 7 days** |
| v22   | Jod      | 2024-10-29       | **2025-10-21**    | 2027-04-30  | Maintenance (6 months in) |
| v24   | Krypton  | **2025-10-28**   | 2026-10-20        | 2028-04-30  | **Active LTS** (current) |
| v25   | —        | n/a (not LTS)    | n/a               | **2026-06-01** | Current non-LTS (5 weeks to EOL) |
| v26   | tbd      | 2026-10-28       | 2027-10-20        | 2029-04-30  | Current (started 2026-04-22, yesterday) |

Key interpretations:

- **Node 20 is in Maintenance, not Active LTS.** The CEO's "why Node 20?" instinct is correct; Node 20 has been behind the line for 18 months. In Maintenance, upstream ships only critical security patches — no performance fixes, no feature backports, no OpenSSL 3 behavior improvements. The [January 2026 security release](https://nodejs.org/en/blog/vulnerability/december-2025-security-releases) and the [March 2026 security release](https://nodejs.org/en/blog/vulnerability/march-2026-security-releases) both cover 20.x, but that safety net disappears on 2026-04-30.
- **Node 22 is also in Maintenance.** It entered Maintenance on 2025-10-21 when Node 24 took over Active LTS. Moving from 20 → 22 buys us exactly 12 months of security patches (22 EOLs 2027-04-30) at the cost of a full major upgrade — a poor trade versus jumping straight to 24, which buys 24 months.
- **Node 24 is the current Active LTS.** It became Active LTS on 2025-10-28 and stays Active until 2026-10-20 (when Node 26 takes over), then Maintenance through 2028-04-30.
- **The CEO's "25.6.1" reference is slightly stale but directionally clear.** Node 25.9.0 was released 2026-04-01; 25.6.1 was 2026-02-10. More importantly, **Node 25 is an odd-numbered Current line, not LTS, and EOLs on 2026-06-01** — we cannot run production on it. Odd-numbered releases exist as preview ground for the next LTS (here: Node 26).
- **Node 26 is technically available** (first Current release 2026-04-22, yesterday) but does not become LTS until 2026-10-28. It is not a production target for another six months.

## 2. How Node 20 ended up on our VPS

Git archaeology from the monorepo (`limitless` repo at `c70d2e6` and its subtree merge):

- `apps/nanoclaw` was merged as a subtree from an upstream NanoClaw repo on **2026-04-03** (commit `c70d2e6`, Merge of `d738b4d` "as 'apps/nanoclaw'"), pre-dating the DR-002 Phase 2 upstream sync (`b4be354`, PR #73). The subtree merge carried the upstream NanoClaw's `.nvmrc: 22` and `container/Dockerfile: FROM node:22-slim` verbatim.
- The host VPS `v20.20.2` is **not** declared anywhere in source — it's whatever apt installed on the VPS-1 host when the Director first provisioned it. The `package.json engines: ">=20"` permits Node 20 and does not bind higher. So the VPS is running the floor of what the engines field allows, while the container base image runs one LTS ahead.
- **The split is a historical accident, not an intentional design.** The container was authored by upstream NanoClaw maintainers (who pinned 22 because 22 was Active LTS when they shipped the Dockerfile). The host was provisioned with whatever the VPS distro shipped; on a typical Debian Bookworm NodeSource install in early 2026, that's the 20.x apt repo.
- **No commit touches `.nvmrc` or the Dockerfile's `FROM` line** between subtree merge and today. PR #73 (DR-002 Phase 2 upstream sync) carried upstream's unchanged version values.

Verdict: neither Node 20 on the host nor Node 22 in the container was an explicit LIMITLESS decision. Both are inherited from upstream NanoClaw and the VPS distro.

## 3. Compatibility matrix — NanoClaw + division stack

Evaluated against the `apps/nanoclaw/package.json` production deps (PR #99 head) and the shared division toolchain. Sources: each package's published `package.json` on unpkg, plus upstream issue trackers.

| Package / runtime concern             | Node 20 | Node 22 | Node 24 | Node 25 | Notes |
|---------------------------------------|---------|---------|---------|---------|-------|
| `@octokit/auth-app@^7.1.1`            | ✅ `>=18` | ✅ | ✅ | ✅ | Declared engines: `node >= 18`. Broad compatibility. |
| `universal-github-app-jwt@2.2.2`      | ✅ (no engines field) | ✅ | ✅ | ✅ | Pure-JS JWT signer; no native code. |
| `discord.js@14.25.1`                  | ⚠️ runtime-works, **not engines-supported** | ✅ declared min `>=22.12.0` | ✅ | ✅ | [discord.js 14.25.1 docs](https://discord.js.org/docs/packages/discord.js/14.25.1) state min Node 22.12.0. **Node 20 is unsupported** even though it currently runs. |
| `better-sqlite3@11.10.0`              | ✅ prebuilt ABI 115 | ✅ prebuilt ABI 127 | ❌ **no prebuilt for ABI 137** | ❌ no prebuilt for 25's ABI | Critical upgrade gate. Requires `better-sqlite3@^12.1.0` for Node 24+. |
| `@onecli-sh/sdk@^0.2.0`               | ✅ `>=20` | ✅ | ✅ | ✅ | Pure TS; no native deps. |
| `cron-parser@5.5.0`                   | ✅ `>=18` | ✅ | ✅ | ✅ | Pure JS. |
| OpenSSL behavior (PEM parsing etc.)   | OpenSSL 3.0.x | OpenSSL 3.0.x → 3.x | OpenSSL 3.x (newer) | OpenSSL 3.x (newest) | All Node ≥18 ships OpenSSL 3; today's PEM issue is not escaped by upgrading, but stricter parsing arrives in newer majors. Infra PEM analysis pending. |
| `vitest` + `typescript` + `esbuild`   | ✅ | ✅ | ✅ | ✅ | Modern toolchain; no gates. |
| Monorepo-wide `pnpm@10.33.0`          | ✅ | ✅ | ✅ | ✅ | pnpm 10 is Node-20+ compatible. |

**Conclusion: the only hard gate for Node 24/25/26 is `better-sqlite3@11 → 12`.** Everything else passes. The gate is well-understood: [better-sqlite3 issue #1384](https://github.com/WiseLibs/better-sqlite3/issues/1384) documents the Node 24/ABI 137 prebuilt shipped in the 12.1.x release train, first cut 2025-06-23.

A secondary observation: **discord.js's declared minimum of Node 22.12.0 means we are already out of compliance on the host today** — the library works, but any issue filed upstream against a Node 20 runtime would be closed as unsupported. This is an unvoiced risk that should be surfaced regardless of which upgrade path we pick.

## 4. Deployment-surface analysis

Five distinct surfaces touch Node in the division:

| Surface | Current Node | How pinned | Owner | Upgrade mechanism |
|---------|--------------|-----------|-------|-------------------|
| VPS-1 host (where `nanoclaw.service` runs) | `v20.20.2` | OS package (`/usr/bin/node` from NodeSource apt) | Director (via SSH) | `apt purge` + NodeSource 24.x repo, or nvm switch |
| NanoClaw container image (agents) | `node:22-slim` | `apps/nanoclaw/container/Dockerfile` `FROM` line | Infra Architect | Edit Dockerfile, rebuild `nanoclaw-agent:latest` |
| Render — PATHS, Cubes+, HUB, Digital Twin | **Unknown** — declared via Render-internal default, not pinned in repo | No `.node-version`, no `.nvmrc`, no `NODE_VERSION` env var in the Terraform `*.tf` files | Director / PlatformOps | Render auto-applies new default on next deploy; we can pin via `.node-version` |
| OS Dashboard (Cloudflare Pages) | Cloudflare Workers runtime (V8 isolates) — not Node | n/a | PlatformOps | Not a Node deployment surface |
| CI (GitHub Actions `ci-build.yml`) | `node-version: 20` (4 jobs: paths, cubes, hub, dt) | `.github/workflows/ci-build.yml` | Infra Architect | Edit yaml |

Three concrete observations:

1. **Host and container are already on different Node majors** (20 vs 22). This is not inherently broken — they run separate processes — but it means our dev-loop, host, and container all test against subtly different V8/OpenSSL behaviors. When Infra's PEM investigation lands, the analysis must specify which runtime it concerns.
2. **Render is the largest unknown surface.** The Terraform for paths/cubes/hub/dt specifies `runtime = "node"` but does not set a Node version. Render announced a new default of 24.14.1 on 2026-04-21 ([Render docs](https://render.com/docs/node-version)); existing services keep their original default, but any redeploy from scratch or infra rebuild would pick the new default. This is a silent drift surface.
3. **CI lags production.** CI pins Node 20 for all 4 build jobs; our VPS runs Node 20; our container runs Node 22. CI-green does not prove container-green. The proposed `build-nanoclaw` CI job (Infra handoff, not yet opened) is already spec'd for `node-version: 20` per the Director's recon — we should amend it in the same PR that lands the rest of this strategy.

## 5. Upgrade paths analyzed

**Path 1 — Stay on Node 20.** Rejected on its face. Node 20 EOLs in 7 days. After 2026-04-30 there are no upstream security patches; any CVE disclosed after that date is permanent on our stack unless we backport manually or move to a commercial extended-support vendor (HeroDevs, etc., at 5-figure annual cost). This is not a credible option even for 30 days.

**Path 2 — Upgrade to Node 22 LTS (matches `.nvmrc`).** Effort: low. Node 22 is already the container base, and `better-sqlite3@11.10.0` has Node 22 prebuilts (ABI 127). VPS upgrade: swap NodeSource apt source or `nvm install 22 && nvm alias default 22`, restart `nanoclaw.service`. CI bump from 20 → 22. Matches `.nvmrc: 22`. **But:** Node 22 is in Maintenance. We'd be upgrading to a runway of 12 months (EOL 2027-04-30) and then repeating this entire exercise. **This is the minimum-disruption, minimum-value path.**

**Path 3 — Upgrade to Node 24 LTS (recommended).** Effort: low-moderate. The one substantive code change is `better-sqlite3@^11.10.0 → ^12.1.0` in `apps/nanoclaw/package.json`. Changelog review of 12.0.x–12.2.x shows no public API breaks that affect our call sites (we use `Database`, `prepare`, `run`, `all`, `get`, transactions — all API-stable across 11→12). Container base `node:22-slim → node:24-slim`. VPS swap same as Path 2 but to NodeSource 24.x. CI bump 20 → 24. Render gets pinned via `.node-version: 24` files dropped into each app directory (belt-and-suspenders, since Render's default is now 24.14.1 anyway). **Runway: Active LTS through 2026-10-20, Maintenance through 2028-04-30 = 24 months.**

**Path 4 — Upgrade to Node 25 Current (CEO's "latest stable").** Rejected. Node 25 is a Current non-LTS line with EOL on 2026-06-01 — five weeks from today. Odd-numbered Node releases exist as API-preview targets for the next LTS; running production on them guarantees another upgrade in weeks, and if a CVE lands post-2026-06-01 we are stranded. The "latest stable" framing is a misnomer: odd-numbered Current lines are stable in the release-quality sense (not alpha/beta), but unstable in the support sense (no LTS guarantees). The conventional production target is always the even-numbered Active LTS.

**Path 5 — Multi-version nvm-managed host with 24 default + 22 fallback.** Considered but rejected as overkill. nvm adds a layer of indirection the VPS does not need; `nanoclaw.service` runs one Node process, and rollback is "apt-install the previous version + restart service" with one minute of downtime. Keep the host simple.

**Path 6 — Container-first upgrade, leave VPS host on 20 for 30 days.** Interesting but foreclosed by the 7-day EOL cliff. If the cliff were 90 days out this would be viable. As it stands, we have to touch the host this month regardless.

## 6. Docker container vs host version coherence

The current host/container split (20 / 22) has no positive rationale — it's an inherited accident. Both run as the same logical product (NanoClaw system). Unifying on 24 reduces cognitive load for the Architect role, collapses two PEM/OpenSSL behavior profiles into one, and eliminates the "which runtime did you reproduce the bug on?" question. The Path 3 rollout explicitly unifies both on `node:24` (container base `node:24-slim`, host NodeSource 24.x) on the same day.

## 7. The `.nvmrc` vs reality mismatch

Three possible resolutions:

- **Bring VPS up to match `.nvmrc` (22).** Resolves the mismatch by upgrading the host. Lowest drift path, but targets the Maintenance LTS we're trying to escape.
- **Bring `.nvmrc` down to match VPS (20).** Dishonest — it would pretend the floor is 20 when Node 20 EOLs in 7 days. Creates a paper lie that will bite us in 30 days.
- **Update both together to 24.** Path 3. The `.nvmrc` becomes `24`, the VPS installs 24, the Dockerfile base becomes `node:24-slim`, the CI matrix becomes `node-version: 24`, and all three sources agree.

Standard resolution is always "bring all sources to the same version"; we should pick the version first (see §5), then align `.nvmrc` to it. The `.nvmrc` is a dev-environment tool (`nvm use` in a fresh clone picks it up), so it must match the production target or developers will write code that fails in CI.

## 8. Render services — Node-version implications

None of `apps/paths`, `apps/cubes`, `apps/hub`, `apps/digital-twin` contain a `.node-version` or `.nvmrc` file; none of the Terraform (`infra/*.tf`) sets a `NODE_VERSION` env var. All four services inherit whatever Render's "default Node version at service creation" was when the service was first deployed. Render's [changelog](https://render.com/changelog) shows the default was 20.11.1 during the PATHS/Cubes/HUB/DT service creation window (Q1 2026); Render bumped the default to 24.14.1 on **2026-04-21** — two days ago. Existing services are grandfathered unless we force a rebuild.

Consequence: we are almost certainly running Node 20 on all four Render services, but **we cannot prove it from the repo** — the authoritative source is the Render dashboard. This is an audit gap. Regardless of which upgrade path we pick, we should drop a `.node-version` file into each app's directory as part of the same PR so that the pin is in source, not in an external dashboard.

`apps/paths/package.json` engines (`^18.20.2 || >=20.9.0`) and `apps/digital-twin/package.json` engines (`>=20`) do not block Node 24. `apps/cubes`, `apps/hub`, `apps/os-dashboard` declare no engines field, so they defer entirely to Render's default.

## 9. Security-patch currency

Node 20.x has received security patches in every Node release train through the [March 2026 Security Releases](https://nodejs.org/en/blog/vulnerability/march-2026-security-releases), including `CVE-2025-59465` (HTTP/2 DoS, High), `CVE-2025-59466` (async_hooks DoS, Medium), `CVE-2025-59464` (TLS memory leak, Medium), `CVE-2026-21636` (permission-model UDS bypass, Medium), `CVE-2026-21637` (TLS PSK/ALPN FD leak, Medium). **After 2026-04-30, these patch trains stop for Node 20.** None of these CVEs are unfixable with our current dependency set via upgrade — they all have fixed versions in 22.x, 24.x, and 25.x. This is the concrete security driver.

Node 24 ships with the newest upstream OpenSSL, Undici, and llhttp that the Node core team is actively maintaining; Node 20 does not. If the Infra Architect's in-flight PEM-parsing analysis surfaces an OpenSSL behavior change, Node 24's OpenSSL may already include the fix that Node 20 will not see.

## 10. Performance + feature differences worth flagging

- **V8 upgrades:** Node 20 ships V8 11.3; Node 24 ships V8 13.5. Concretely: faster `Array` iteration, faster regex (V8's Irregexp updates), improved `Intl` memory footprint. Benchmarks from [pkgpulse's Node 22 vs 24 study](https://www.pkgpulse.com/blog/nodejs-22-vs-nodejs-24-2026) suggest 5-15% improvements on typical workloads; npm v11 (bundled with Node 24) is ~65% faster than npm v10.
- **Native fetch and Undici:** Stable `fetch`, `Request`, `Response`, `FormData`, and `WebSocket` globals are unflagged in Node 22+; Node 20 had them but as experimental. We have one `fetch` call in NanoClaw (`src/ipc.ts`) that would move from experimental to stable coverage.
- **Built-in test runner:** Node 24's `node:test` has subtest sequencing fixes and TAP reporter parity with vitest. We don't use `node:test` today (vitest), so this is latent value.
- **Built-in `sqlite` module:** Node 22+ ships an experimental `node:sqlite` that could eventually replace `better-sqlite3`. Node 24 keeps it experimental. Not actionable in this upgrade window, but worth tracking: eliminating the native-binding dependency would end the ABI-bump-per-major churn we're paying today.
- **Permission model:** Node 24's `--permission` flag graduated from experimental. Not immediately relevant to NanoClaw (which manages its own permission model via Docker isolation), but relevant for the container-runner in DR-001 Phase 4 hardening.

## 11. Recommendation with timeline

**Target: Node 24 LTS, division-wide, staged rollout over 30 days.** Details:

**Week 1 (by 2026-04-30 — before Node 20 EOL):**
1. Open handoff to Infra Architect with three-commit PR on `apps/nanoclaw/`:
   - (a) `apps/nanoclaw/package.json`: bump `better-sqlite3` from `11.10.0` to `^12.3.0` (latest 12.x at spec-write time — Infra to verify and re-pin exactly).
   - (b) `apps/nanoclaw/.nvmrc`: `22` → `24`.
   - (c) `apps/nanoclaw/container/Dockerfile`: `FROM node:22-slim` → `FROM node:24-slim`.
2. Regenerate `pnpm-lock.yaml` at monorepo root.
3. Run full NanoClaw verification: `pnpm install --frozen-lockfile`, `pnpm --filter nanoclaw build`, `pnpm --filter nanoclaw test` (container-runner.test.ts 10/10 green is the hard gate; better-sqlite3-dependent tests should additionally pass now that 12.x has ABI 137 prebuilts).
4. Director SSH to VPS-1: stop `nanoclaw.service`, swap NodeSource apt source from 20.x to 24.x, `apt install nodejs`, restart service. Rollback plan: `apt install nodejs=20.*` + service restart, < 2 min recovery.
5. CI amendment in the same PR: `.github/workflows/ci-build.yml` — bump all four `node-version: 20` to `node-version: 24`.

**Week 2–3 (Render services):**
6. Drop `.node-version: 24` files into `apps/paths/`, `apps/cubes/`, `apps/hub/`, `apps/digital-twin/`. These pin the Render runtime in source rather than in the dashboard. Redeploy each service one at a time, verifying the post-deploy health-check workflow passes between each.
7. Audit the Render dashboard for each service, record the current Node version in a Terraform comment block for future transparency, confirm pin takes effect.

**Week 4 (loose-ends):**
8. Add a `engines.node: ">=24"` field to `apps/cubes/package.json`, `apps/hub/package.json`, `apps/os-dashboard/package.json` to close the audit gap (matches the existing PATHS, DT, NanoClaw pattern).
9. Update Architect CLAUDE.md / governance spec to reference Node 24 as the division standard.
10. Schedule a calendar reminder for **2026-09-01** to re-evaluate: Node 26 becomes LTS 2026-10-28; by then we'd consider whether to jump or stay on 24 through its full LTS cycle.

**Coordination:**
- **MVAP Step 1** (in-flight tonight): independent of this strategy. MVAP is about container agent lifecycle; Node version is orthogonal. Proceed with MVAP; this work queues behind.
- **Infra PEM analysis:** should be treated as a sibling investigation, not a dependency. If Infra's analysis concludes the OpenSSL 3 behavior change requires a specific Node patch level, we re-pin Node 24 to that patch. If it concludes the issue is OpenSSL-version-independent, no change to this plan.
- **Issue 4 CI amendment** (Infra's `build-nanoclaw` job handoff): should be landed as `node-version: 24` directly, not `20`. Saves a future amend-PR.

**Cost of not doing this:**
- After 2026-04-30: the division runs on an EOL Node runtime with no upstream security patches. Every CVE disclosed thereafter is a permanent stack risk until we upgrade. Compliance auditors (MiFID II context for MYTHOS NanoClaw per DR-002 spec) view EOL runtime components as a material finding. The longer we defer, the further behind we fall (Node 26 ships Oct 28, making 22 → Maintenance-2 and 24 → Active-LTS-1).

## Option comparison table — decision grade

| Criterion | Path 1 — stay 20 | Path 2 — upgrade to 22 | **Path 3 — upgrade to 24 (rec.)** | Path 4 — jump to 25 | Path 5 — container 24, host 20 |
|-----------|------------------|------------------------|-----------------------------------|---------------------|-------------------------------|
| Support runway from today | **0 days** (EOL 2026-04-30) | 371 days (EOL 2027-04-30) | **731 days (EOL 2028-04-30)** | 38 days (EOL 2026-06-01) | 0 days for host |
| LTS phase at rollout | Maintenance (dying) | Maintenance | **Active LTS** | Current non-LTS | Mixed |
| Effort (engineer-hours) | 0 | ~4 (NodeSource swap + CI bump + deploy) | **~6 (same + better-sqlite3 bump + Render pins)** | ~6 + continuous churn | blocked |
| `better-sqlite3` upgrade required | No | No | **Yes — 11.10.0 → ^12.3.0** | Yes | N/A |
| Breaks `discord.js` engines | Yes (still unsupported on 20) | **No (first engines-compliant path)** | **No** | No | Yes |
| Render alignment with new default | No | No | **Yes — matches Render default 24.14.1** | No | No |
| Audit posture | **Fails** (EOL runtime) | Marginal (Maintenance LTS) | **Strong (Active LTS)** | Fails (non-LTS) | Fails |
| Risk of needing another upgrade in 12 months | n/a (already broken) | **High** (22 EOL Apr 2027) | Low | **Very high** (25 EOL June 2026) | n/a |
| Recommendation | Reject | Acceptable fallback | **Adopt** | Reject | Reject |

## Open questions for CEO ratification

1. **Timeline latitude.** The 30-day plan is aggressive but deliverable. CEO may prefer a 45- or 60-day plan to stretch across MVAP Step 1, the PR #73 regression audit, and Q3 dispute resolution roll-in. Does the CEO want us to compress (aim for <14 days) or relax to 45+?
2. **`better-sqlite3` 12.x exact pin.** Do we pin exactly (`12.3.0` no-caret, mirroring the PR #99 pattern for `discord.js`) or allow minor upgrades (`^12.3.0`)? Consistency argument says exact-pin anything with native code.
3. **Render `.node-version` strategy.** Do we pin to the exact patch (`24.14.1`) to match Render's current default and avoid surprise auto-upgrades, or pin to the major (`24`) and accept whatever Render's `24.x` resolver picks? Exact-pin offers reproducibility; major-pin offers automatic security patch absorption.
4. **Should OS Dashboard (Cloudflare Pages) be treated as in-scope?** The V8-isolate runtime isn't Node, but the build step uses Node. Recommend scoping: the **build** Node version matters (CI `node-version: 24`); the runtime is non-Node.
5. **Container image rebuild cadence.** Today we build `nanoclaw-agent:latest` ad-hoc from a Dockerfile on the VPS. With Node 24 as the base, do we want to formalize a cron-driven rebuild (daily? weekly?) to pick up `node:24-slim` security updates, or keep the current manual cadence?
6. **Future-proofing for Node 26.** Node 26 becomes Active LTS on 2026-10-28 (6 months from now). Do we commit to a standing "upgrade to the current Active LTS within 6 months of release" policy, or handle each major individually? A policy eliminates the "why are we on X?" question at the next rotation.

## Cross-references

- **DR-002 (PR #62, #73):** Monorepo-as-NanoClaw-source-of-truth; this memo proposes the first division-wide version change that will flow through that pipeline.
- **DR-001 Phase 3 (PR #85, merged):** GitHub App token generation at container spawn; unaffected by Node version. Phase 4 container-runner hardening intersects with Node 24's `--permission` graduation (see §10).
- **Infra PEM analysis** (#infra-eng msg 1496971927799992510+): sibling investigation; results should be cross-referenced into the revision that closes out this memo.
- **CI `build-nanoclaw` job amendment:** In-flight Infra handoff. Recommend landing with `node-version: 24` directly.
- **PR #99 (merged):** Established the exact-pin convention for native deps (`discord.js: 14.25.1`). This memo proposes extending the same convention to `better-sqlite3: 12.3.0` (pending CEO decision 2 above).
- **§5.5 verification discipline (PR #94):** Any handoff that implements this memo must carry attestation checkboxes per §5.5; the `better-sqlite3` upgrade verification path is `pnpm install + build + test` in a temp clone with the new native binding confirmed loaded.

---

**Prepared by:** LIMITLESS main-ops Architect
**Status:** DRAFT — awaiting CEO ratification before Infra handoff
**Next step on ratification:** Infra handoff to implement Week 1 rollout (§11)
