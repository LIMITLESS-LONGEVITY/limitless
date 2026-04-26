# Research-wave dispatcher

Sequential cron dispatcher for the agentic-SDLC research wave kicked off by PR #115. Watches for output files in `docs/superpowers/reports/research/` and advances through 9 dispatch templates (A.1 → A.2 → ... → D.1), one at a time, sending each via the OpenClaw Director bot to `#infra-eng` for the Infra Architect to execute.

## Why concentrated + sequential

CEO directive 2026-04-27: prioritize quality over speed for the research wave. All 9 dispatches go to one architect (Infra) sequentially. Each dispatch has Opus 4.7 + effort=high (per `claude.ts:268` patch in NanoClaw v2). Wall-clock estimate: ~6-12 hours.

## Files in this dir

| File | Role |
|---|---|
| `research-dispatcher.sh` | The cron-driven advancement script. Stateless except for state file. |
| `research-sequence-state.template.json` | Initial-state template. Copy to `/home/limitless/research-sequence-state.json` on first deploy. |
| This `README.md` | Operational notes. |

## Files on VPS-1 (not in repo — operational state)

| Path | Purpose |
|---|---|
| `/home/limitless/research-dispatcher.sh` | Deployed copy of the script (mode 0755) |
| `/home/limitless/research-sequence-state.json` | Live state — mutates every tick |
| `/home/limitless/research-dispatcher.log` | Cron output log |

## Deploy

On VPS-1 as `limitless` user:

```bash
cp /home/limitless/projects/limitless/infra/scripts/research-dispatcher/research-dispatcher.sh /home/limitless/research-dispatcher.sh
chmod +x /home/limitless/research-dispatcher.sh

# Initial state — only on first deploy or after a reset
cp /home/limitless/projects/limitless/infra/scripts/research-dispatcher/research-sequence-state.template.json \
   /home/limitless/research-sequence-state.json

# Cron entry (every 40 min)
( crontab -l 2>/dev/null | grep -v research-dispatcher.sh ; \
  echo "*/40 * * * * /home/limitless/research-dispatcher.sh >>/home/limitless/research-dispatcher.log 2>&1" ) | crontab -
```

The first dispatch (A.1) must be sent manually — the cron only advances on completion. To send the first dispatch:

```bash
sudo -u limitless openclaw message send \
  --channel discord --target 1489333758732664832 \
  --message "$(cat /path/to/a1_dispatch_msg.txt)" --json
```

Then update state file with the message ID and current dispatch:

```bash
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq --arg ts "$TS" --arg msgid "<msg_id_returned_above>" \
   '.current_dispatch_id = "A.1" | .current_dispatched_at = $ts | .current_dispatch_msg_id = $msgid | .last_check_at = $ts' \
   /home/limitless/research-sequence-state.json > /tmp/state.tmp \
  && mv /tmp/state.tmp /home/limitless/research-sequence-state.json
```

Cron handles all subsequent advancement.

## Audit / monitor

- **Live state:** `cat /home/limitless/research-sequence-state.json`
- **Cron log:** `tail -f /home/limitless/research-dispatcher.log`
- **Completed outputs (canonical artifacts):** `ls -la /home/limitless/projects/limitless/docs/superpowers/reports/research/*.md`
- **Discord audit:** `#infra-eng` channel + threads (per `feedback_v2_dispatch_via_bind_mount_for_long_prompts.md`, both channel + threads must be checked)

## Pause / resume

- **Pause:** comment the cron line, or remove the state file (dispatcher exits if state file missing)
- **Resume:** uncomment cron OR re-create state file
- **Force-advance** (skip a stuck dispatch): edit state file, manually increment `current_index`, update `current_dispatch_id` to the new one, dispatch its pointer message, rerun script

## Architecture decisions

1. **State file as canary, output file as truth.** The dispatcher trusts only the presence of an output markdown file at the expected path. No clever "did the architect respond on Discord" detection — files are stable, Discord messages are not.
2. **Bind-mount-as-mailbox dispatch pattern.** Per `feedback_v2_dispatch_via_bind_mount_for_long_prompts.md`, NanoClaw v2's `engage_mode='mention'` only ingests the first message of a multi-message dispatch. The dispatcher sends a SHORT pointer to the full prompt file in the bind-mount; architect reads from the file.
3. **No retries on architect failure.** If a dispatch hangs, the script just stays at that index. Manual intervention required — by design, since silent retries would mask real problems.
4. **No parallelism.** Concentrated on Infra Architect by design (CEO directive 2026-04-27).
5. **Live state NOT committed.** State file is operational state; gets mutated every tick. Committing would create constant churn. Template captures the schema; live state lives only on VPS.

## Related artifacts

- PR #115 — research-wave kickoff (committed all 10 dispatch templates)
- `docs/superpowers/reports/research/dispatch-templates/` — the 10 templates this script orchestrates
- `MEMORY.md` strategic-pivot section
- `project_meta_pivot_machine_that_builds_machines.md` — the why
- `feedback_v2_dispatch_via_bind_mount_for_long_prompts.md` — the bind-mount-as-mailbox pattern
