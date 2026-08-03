# Local Verification Runbook

## Purpose

Use these checks to confirm the repository is in a sane local state without printing secrets or claiming production proof.

## Safe checks

| Check        | Command                                        | What it proves                                                    |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| Env contract | `pnpm check:env`                               | Framework dotenv values are valid and no public AI key is exposed |
| Formatting   | `pnpm format:check`                            | Markdown and source formatting are stable                         |
| Lint         | `pnpm lint`                                    | Import boundaries and package lint are clean                      |
| Types        | `pnpm typecheck`                               | The workspace compiles under TypeScript                           |
| Tests        | `pnpm test`                                    | Unit and integration coverage still passes locally                |
| Build        | `pnpm build`                                   | The workspace still produces a production build locally           |
| Docs         | `node .claude/scripts/validate-docs.cjs docs/` | Docs links and validation rules still pass                        |

## Guardrails

- Do not echo database passwords, `LEARNING_DATABASE_URL`, or other secret values in the terminal.
- Do not run `pnpm supabase:status` in shared logs: its output can include local
  development credentials. Use the Supabase Studio health indicators locally,
  without copying connection values into tickets or documentation.
- Do not treat local success as hosted CI, device, or deployment proof.
- Keep the result scoped to the repo state on this machine.

## When to use

- Before changing docs that describe commands, contracts, or release boundaries
- Before reviewing a release note or runbook
- After a repo refresh, dependency update, or migration change

## Related docs

- [Release validation evidence](../release/validation-evidence.md)
- [Known limitations](../release/known-limitations.md)
- [Deployment guide](../deployment-guide.md)
