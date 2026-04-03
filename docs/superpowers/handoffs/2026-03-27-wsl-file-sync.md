# Handoff: WSL File Sync — Complete Migration from Windows FS

The WSL migration cloned git repos but left untracked local files behind on Windows FS (`/mnt/c/Projects/LIMITLESS/`). Main already copied the `docs/superpowers/` gap (specs, plans, handoffs, templates). This task covers everything else.

---

## Already Copied (by Main)
- `docs/superpowers/specs/` — 6 missing files copied
- `docs/superpowers/plans/` — 2 missing files copied
- `docs/superpowers/handoffs/` — 8 missing files copied
- `docs/superpowers/templates/` — entire dir copied

## Still Missing on Linux FS

### 1. limitless-infra — missing files
Linux FS is missing `scripts/` dir and `terraform.tfvars` (secrets, gitignored):
```
MISSING: limitless-infra/scripts/restore-custom-domains.sh
MISSING: limitless-infra/terraform.tfvars          ← SECRETS, gitignored
MISSING: limitless-infra/terraform-state-backup-2026-03-23.json
```
**Action:** `cp /mnt/c/Projects/LIMITLESS/limitless-infra/scripts/ ~/projects/LIMITLESS/limitless-infra/scripts/ -r` and same for the two files.

### 2. limitless-digital-twin — entire repo missing
Windows has a scaffold at `/mnt/c/Projects/LIMITLESS/limitless-digital-twin/` (Fastify + Drizzle, README + basic structure). Linux FS has no such directory.
**Action:** If this was pushed to GitHub, clone it. If not, copy the directory over.

### 3. Umbrella-level files — verify these exist
```
Windows                              Linux
CLAUDE.md                            ✅ (committed to git)
CNAME                                ✅
index.html                           ✅
README.md                            ✅
LIMITLESS_Website_Build_Prompt.md    ✅
docker-compose.dev.yml               ? verify
get-docker.sh                        ? verify
qrcode.png                           ? verify
Images/                              ? verify (6 founder photos)
TEMP/                                ? verify (logos, screenshots, briefs, scratch files)
docs/production-accounts.md          ? verify
docs/qa-report-2026-03-25.md         ? verify
learnhouse/                          ? verify (likely empty archive)
```

### 4. Full sweep
After copying known gaps, run a final diff:
```bash
# Linux FS side (fast)
cd ~/projects/LIMITLESS && find . -type f -not -path './.git/*' -not -path './limitless-paths/*' -not -path './limitless-hub/*' -not -path './limitless-paths-workbench/*' -not -path './node_modules/*' -not -path './.claude/*' | sort > /tmp/lin_files.txt

# Windows FS side (slow — be patient, ~30s)
cd /mnt/c/Projects/LIMITLESS && find . -type f -not -path './.git/*' -not -path './limitless-paths/*' -not -path './limitless-hub/*' -not -path './node_modules/*' -not -path './.claude/*' | sort > /tmp/win_files.txt

# Diff
diff /tmp/win_files.txt /tmp/lin_files.txt
```

### 5. Critical: terraform.tfvars
This file contains all production secrets (Render API key, Stripe keys, Sentry tokens, DB passwords). The workbench needs it for Task 5 (HUB Terraform) and to verify the staging DB ipAllowList for Task 1. Copy it first:
```bash
cp /mnt/c/Projects/LIMITLESS/limitless-infra/terraform.tfvars ~/projects/LIMITLESS/limitless-infra/terraform.tfvars
```

The `RENDER_API_KEY` inside is also needed to verify the staging DB ipAllowList (Task 1 blocker).
