// One-shot ingestion of the screenplays listed in ${SCREENPLAYS_DIR}/manifest.json into Pinecone.
// Usage: bun run ingest   (SCREENPLAYS_DIR and PINECONE_NAMESPACE select the documents and target)
import { createModelCounter } from '../src/ingest/tokens'
import { getConfig } from '../src/server/config'
import { DocumentsError, loadDocuments } from '../src/server/documents'
import { createFastembedEmbedder } from '../src/server/embedder'
import { ingestAll, StoreNotEmptyError } from '../src/server/ingest'
import { createPineconeStore } from '../src/server/store'

try {
  const config = getConfig()
  const documents = await loadDocuments(config.screenplaysDir)
  console.log(`${documents.length} documents from ${config.screenplaysDir}`)

  const [counter, embedder] = await Promise.all([
    createModelCounter(config.embeddingCacheDir),
    createFastembedEmbedder({ model: config.embeddingModel, cacheDir: config.embeddingCacheDir }),
  ])
  const store = createPineconeStore(config.pinecone)
  console.log(`Ingesting into index "${config.pinecone.index}", namespace "${store.namespace}"`)

  const result = await ingestAll({ documents, embedder, store, counter, log: line => console.log(`  ${line}`) })
  for (const { imdbId, warning } of result.warnings) console.warn(`  warning ${imdbId}: ${JSON.stringify(warning)}`)
  console.log(`Done: ${result.documents} documents, ${result.chunks} chunks at ${result.ingestedAt}`)
} catch (error) {
  if (error instanceof DocumentsError || error instanceof StoreNotEmptyError) {
    console.error(error.message)
  } else {
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : error)
  }
  process.exit(1)
}
