/**
 * Example 10: Error Handling
 * Level: Beginner
 *
 * Demonstrates how to handle agent failures gracefully.
 * In parallel(), a failed thunk resolves to null.
 * In pipeline(), a failed stage drops the item to null
 * and skips remaining stages for that item.
 *
 * Key takeaway: Always .filter(Boolean) after parallel() or
 * pipeline() to remove null entries from failures.
 */

export const meta = {
  name: 'error-handling',
  description: 'Shows graceful error handling for failed agents',
  phases: [{ title: 'Process', detail: 'process items with error tolerance' }],
}

const WORDS = ['cat', 'dog', 'elephant']

phase('Process')

// Pipeline: if a stage fails for one item, that item becomes null
const results = await pipeline(
  WORDS,
  (word) => agent(
    `Translate "${word}" to Spanish. Reply with ONLY the Spanish word.`,
    { label: `translate:${word}`, phase: 'Process' }
  ),
  (spanish, word, i) => agent(
    `Use "${spanish}" in a short Spanish sentence.`,
    { label: `sentence:${word}`, phase: 'Process' }
  )
)

// Filter nulls — these are items where a stage failed
const successful = results.filter(Boolean)
const failed = results.filter((r) => r === null || r === undefined)

log(`Success: ${successful.length}, Failed: ${failed.length}`)

// Parallel: same pattern — null for failures
const extras = await parallel([
  () => agent('Name a color in Spanish.', { label: 'extra-1', phase: 'Process' }),
  () => agent('Name a fruit in Spanish.', { label: 'extra-2', phase: 'Process' }),
])

const validExtras = extras.filter(Boolean)
log(`Extras collected: ${validExtras.length}`)

return {
  sentences: successful,
  extras: validExtras,
  totalAttempted: WORDS.length + 2,
  totalSucceeded: successful.length + validExtras.length,
}
