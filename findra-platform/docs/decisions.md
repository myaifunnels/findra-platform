# Findra decisions log

A dated record of decisions about Findra: what was decided, why, and who decided. Newest first.

Rules that agents must follow on every task live in [`AGENTS.md`](../AGENTS.md). This log keeps the history and the reasons behind them, so a later session can see why something is the way it is without asking again.

## How to add an entry

Add a new section at the top of the list below:

```
## YYYY-MM-DD: Short title

- **Decision:** what was decided.
- **Why:** the reason, in a sentence or two.
- **Decided by:** client, AiFunnels, or both.
- **Affects:** pages, files or flows it touches (optional).
```

If the decision is a lasting rule, also add or update its bullet under "Durable Findra design decisions" in `AGENTS.md`.

## Decisions

## 2026-11-20: Keep AI agent memory in the repo

- **Decision:** Agent memory for this project lives in committed files: `AGENTS.md` for standing rules, this log for dated decisions, and a root `CLAUDE.md` that loads `AGENTS.md` for Claude Code. No third-party memory tool (ruflo, claude-mem) is installed.
- **Why:** Most agent work runs in fresh cloud sessions, so memory stored on one machine would not carry over. Committed files work the same in Claude Code, Codex and on any computer, at no extra cost.
- **Decided by:** AiFunnels.
- **Affects:** `CLAUDE.md`, `findra-platform/AGENTS.md`, `findra-platform/docs/decisions.md`.
