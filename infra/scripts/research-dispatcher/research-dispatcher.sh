#!/bin/bash
# Research-wave dispatcher — checks for completion of current dispatch + advances to next
#
# Reads:    /home/limitless/research-sequence-state.json
# Watches:  /home/limitless/projects/limitless/docs/superpowers/reports/research/<id>-*-2026-04-27.md
# Dispatches via: openclaw message send (Director bot → #infra-eng)
# Logs:     /home/limitless/research-dispatcher.log
#
# Run via: cron */40 * * * * /home/limitless/research-dispatcher.sh >>/home/limitless/research-dispatcher.log 2>&1

set -euo pipefail

STATE=/home/limitless/research-sequence-state.json
TEMPLATES=/home/limitless/projects/limitless/docs/superpowers/reports/research/dispatch-templates
OUTPUTS=/home/limitless/projects/limitless/docs/superpowers/reports/research
INFRA_ENG_CHANNEL=1489333758732664832
ARCHITECT_MENTION='<@1489316043829809283>'
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

log() { echo "[$TS] $*"; }

if [ ! -f "$STATE" ]; then
  log "ERROR: state file missing at $STATE — nothing to do. Run init first."
  exit 0
fi

# Read state
SEQUENCE=$(jq -r '.sequence | join(" ")' "$STATE")
INDEX=$(jq -r '.current_index' "$STATE")
SEQ_ARRAY=($SEQUENCE)
TOTAL=${#SEQ_ARRAY[@]}

if [ "$INDEX" -ge "$TOTAL" ]; then
  log "All $TOTAL dispatches complete. Nothing to do."
  exit 0
fi

CURRENT_ID="${SEQ_ARRAY[$INDEX]}"
CURRENT_TEMPLATE="$TEMPLATES/$CURRENT_ID*.md"
EXPECTED_OUTPUT_GLOB="$OUTPUTS/$CURRENT_ID-*-2026-04-27.md"

# Resolve template file
TEMPLATE_FILE=$(ls $CURRENT_TEMPLATE 2>/dev/null | head -1 || true)
if [ -z "$TEMPLATE_FILE" ]; then
  log "ERROR: no template file matching $CURRENT_TEMPLATE"
  exit 1
fi

# Check if current dispatch's output file exists
OUTPUT_FILE=$(ls $EXPECTED_OUTPUT_GLOB 2>/dev/null | head -1 || true)

if [ -n "$OUTPUT_FILE" ]; then
  # Output file exists → mark complete, advance, dispatch next
  log "Dispatch $CURRENT_ID COMPLETE — output at $OUTPUT_FILE ($(wc -l <"$OUTPUT_FILE") lines)"
  NEW_INDEX=$((INDEX + 1))

  # Update state
  jq --argjson i "$NEW_INDEX" \
     --arg ts "$TS" \
     --arg id "$CURRENT_ID" \
     '.current_index = $i
      | .completed_dispatches += [{id: $id, completed_at: $ts}]
      | .last_check_at = $ts' \
     "$STATE" > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"

  if [ "$NEW_INDEX" -ge "$TOTAL" ]; then
    log "ALL DISPATCHES COMPLETE. Sequence done."
    /home/limitless/.local/bin/openclaw message send \
      --channel discord --target "$INFRA_ENG_CHANNEL" \
      --message "Research wave complete. All 9 dispatches landed. CEO can review outputs at \`docs/superpowers/reports/research/\` and proceed to planning phase." \
      --json >/dev/null 2>&1 || log "WARN: completion notification send failed"
    exit 0
  fi

  # Dispatch next
  NEXT_ID="${SEQ_ARRAY[$NEW_INDEX]}"
  NEXT_TEMPLATE=$(ls "$TEMPLATES/$NEXT_ID"*.md 2>/dev/null | head -1)
  log "Advancing to dispatch $NEXT_ID via template $NEXT_TEMPLATE"

  RELATIVE_TEMPLATE_PATH="docs/superpowers/reports/research/dispatch-templates/$(basename $NEXT_TEMPLATE)"
  POINTER_MSG="$ARCHITECT_MENTION — research dispatch $NEXT_ID. Read full prompt from monorepo bind-mount: \`/workspace/extra/monorepo/$RELATIVE_TEMPLATE_PATH\`. Common context first: \`docs/superpowers/reports/research/dispatch-templates/00-COMMON-CONTEXT.md\`. Analysis-only, no code changes, no PRs. Output goes to \`docs/superpowers/reports/research/$NEXT_ID-<topic-slug>-2026-04-27.md\`. Take your time. Multi-message Discord OK."

  RESULT=$(openclaw message send \
    --channel discord --target "$INFRA_ENG_CHANNEL" \
    --message "$POINTER_MSG" --json 2>&1) || { log "ERROR dispatching $NEXT_ID: $RESULT"; exit 1; }

  MSG_ID=$(echo "$RESULT" | jq -r '.payload.result.messageId // "unknown"')
  log "Dispatched $NEXT_ID → Discord msg $MSG_ID"

  # Record dispatch
  jq --arg id "$NEXT_ID" --arg ts "$TS" --arg msgid "$MSG_ID" \
     '.current_dispatch_id = $id
      | .current_dispatched_at = $ts
      | .current_dispatch_msg_id = $msgid' \
     "$STATE" > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"
else
  # Still in flight
  DISPATCHED_AT=$(jq -r '.current_dispatched_at // ""' "$STATE")
  log "Dispatch $CURRENT_ID still in flight (dispatched at $DISPATCHED_AT). No advancement."

  # Update last_check_at
  jq --arg ts "$TS" '.last_check_at = $ts' "$STATE" > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"
fi
