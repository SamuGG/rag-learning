# Synthetic samples

These files are **original, synthetic text** written for this project. They are not taken from, and do not reproduce,
any real film or screenplay. Titles are fictitious and the IMDB-style IDs (`tt0000001`, `tt0000002`) are placeholders
that only satisfy the manifest format.

Use them to try the pipeline without your own documents:

```sh
SCREENPLAYS_DIR=data/samples bun run chunk:preview data/samples/frozen-canyon.txt
```

Never add real screenplays, in full or in part, to this repository. See
[legal and sample data](../../docs/legal-and-sample-data.md).
