# Notes for Claude

Read [README.md](README.md) first; it links every document. Key rules:

- Bun only at runtime. Use Bun built-ins before adding dependencies.
- Before committing, run `bun run verify`. Never name a package script `check` or `fmt`.
- Commits: Conventional Commits, sentence-case subject, header up to 100 characters (`commitlint.config.cjs`).
- Spelling is British English (`cspell.json`); add genuine project terms to its `words` list.
- Never add real screenplay text, in full or in part. Tests and docs use invented names and synthetic text only.
- The chunker (`src/ingest/`) is pure: no network, no config, no Pinecone code.
- Server-only code lives under `src/server/`; `getConfig()` must never reach client bundles.
- Hard limits for Claude live in `.claude/settings.json` (`permissions.deny`); git hooks only lint.
- Update [docs/backlog.md](docs/backlog.md) when scope changes; GitHub Issues mirror it.
