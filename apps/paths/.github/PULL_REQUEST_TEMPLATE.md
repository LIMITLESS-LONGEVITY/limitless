## Summary

<!-- What changed and why? 1-3 bullet points. -->

-

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Infrastructure / CI
- [ ] Documentation

## Checklist

- [ ] `pnpm build` passes locally
- [ ] `pnpm lint` passes
- [ ] If schema changed: migration created (`pnpm payload migrate:create`)
- [ ] If admin components changed: `pnpm generate:importmap` run
- [ ] If new collection: `payload_locked_documents_rels` migration included
- [ ] No `.env*`, `.claude/`, or temp files committed

## Test Plan

<!-- How to verify this change works? -->

-
