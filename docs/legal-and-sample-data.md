# Legal and sample data

Screenplays are copyrighted works. This repository must **never** contain a real screenplay, in full or in part.

## Rules

- Your own screenplays go in `data/screenplays/`, which is git-ignored. Claude Code's project settings
  (`.claude/settings.json`) also deny Claude edits there and forced `git add`.
- Committed samples in `data/samples/` are **original, synthetic text** written for this project, with fictitious
  titles and placeholder IDs (`tt0000001`, `tt0000002`). They are marked `"synthetic": true` in their manifest.
- Tests, fixtures and documentation use invented character names and invented text only.
- Answers must not reproduce long verbatim passages; the answer prompt asks for summaries with scene citations.
- Pinecone stores chunk text from the documents you ingest. Delete the namespace or index when you are done (see
  [tidy-up](tidy-up.md)).

You are responsible for having the right to use any screenplay you ingest locally.
