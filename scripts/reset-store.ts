// Deletes every record in the configured Pinecone namespace so ingestion can run again.
// Usage: bun run reset-store --yes   (PINECONE_NAMESPACE selects the namespace)
import { getConfig } from '../src/server/config'
import { createPineconeStore } from '../src/server/store'

const config = getConfig()
const store = createPineconeStore(config.pinecone)
const state = await store.state()
const target = `index "${config.pinecone.index}", namespace "${store.namespace}"`
const contents = state.sentinel
  ? `${state.records} records (ingested ${state.sentinel.ingestedAt})`
  : `${state.records} records (no completed ingestion)`

if (!Bun.argv.includes('--yes')) {
  console.error(`This deletes ${contents} from ${target}. Re-run with --yes to confirm.`)
  process.exit(1)
}

await store.reset()
console.log(`Deleted ${contents} from ${target}.`)
