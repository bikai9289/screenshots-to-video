# Delivery and verification

- After each functional change, run `pnpm build`; also run `git diff --check` before handoff.
- Keep changes surgical and scoped to the reported behavior; avoid unrelated formatting/refactors.
- Before any commit, run the repository `security-scan` skill and resolve high-severity findings.
- For schema changes, run `pnpm db:push` immediately in development; use reviewed generate/migrate for production.
