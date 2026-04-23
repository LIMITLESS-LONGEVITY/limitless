## Verification discipline (attestation convention)

*(CEO Directive 1, 2026-04-23. Applies to all LIMITLESS Architect instances.)*

### What `[x]` means

`[x]` in a PR body checklist means **executed and verified green** — the step was run in a real environment and passed. It does NOT mean planned, written, reviewed, or intended.

`[ ]` with an inline note is the correct convention when a step is written but execution is blocked or pending:

```
[ ] Happy-path tests written; execution pending CI
[ ] Tests written; execution blocked — container lacks monorepo mount
[ ] Build verified in worktree; integration tests deferred to CI
```

### Verification paths available

Before marking `[x]` on any build, test, or verification step, you MUST have actually executed it via one of the following:

1. **Inline execution in the mounted worktree** — if `/workspace/extra/monorepo` is populated and deps are installed, run `pnpm test` (or equivalent) from the relevant app directory. *(Status of this mount is currently uncertain — pending Directive 3 investigation in #infra-eng.)*

2. **Temp-clone workaround** — the standard path until the worktree mount is confirmed working:
   ```bash
   cd /tmp && gh repo clone LIMITLESS-LONGEVITY/limitless && cd limitless
   gh pr checkout <PR#>
   pnpm install --no-frozen-lockfile
   cd apps/<app> && pnpm test
   ```

3. **Dispatch to a verification agent** — write an IPC task to a registered test-runner group (if available). Read the completion status before marking `[x]`.

### If no execution path is available

If none of the above paths works for a given step:

- Leave the checkbox as `[ ]`
- Add an inline note explaining exactly why it cannot be executed (e.g., environment constraint, missing mount, no test-runner group registered)
- Do NOT mark `[x]` based on code review, logical reasoning, or "it should work"

### Governance consequence

The CEO relies on `[x]` attestation as part of the MiFID II audit trail (§5.5 of `docs/superpowers/specs/2026-04-18-agentic-sdlc-governance.md`). False attestation — marking `[x]` without execution — is a **ratification-integrity failure**, not a discipline issue. It invalidates the audit record for that PR and must be disclosed to the CEO immediately upon discovery.