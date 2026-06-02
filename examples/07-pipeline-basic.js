/**
 * Example 07: Pipeline Basics
 * Level: Beginner
 *
 * Demonstrates pipeline() — the workhorse of dynamic workflows.
 * Each item flows through all stages independently.
 * No barrier between stages: Item A can be in stage 3
 * while Item B is still in stage 1.
 *
 * Key takeaway: pipeline() is the DEFAULT for multi-stage work.
 * Wall-clock time = slowest single-item chain, NOT sum of slowest per stage.
 *
 * pipeline(items, stage1, stage2, ...)
 * Each stage receives (prevResult, originalItem, index)
 */

export const meta = {
  name: 'pipeline-basic',
  description: 'Shows pipeline() processing items through stages',
  phases: [
    { title: 'Translate', detail: 'translate each word' },
    { title: 'Decorate', detail: 'decorate each translation' },
  ],
}

const words = ['hello', 'world', 'workflow']

const results = await pipeline(
  words,
  // Stage 1: Translate each word
  (word) => agent(
    `Translate the word "${word}" to French. Respond with ONLY the French word.`,
    { label: `translate:${word}`, phase: 'Translate' }
  ),
  // Stage 2: Use each translation in a sentence
  (frenchWord, originalWord, index) => agent(
    `Use the French word "${frenchWord}" (from English "${originalWord}") in a short French sentence.`,
    { label: `sentence:${originalWord}`, phase: 'Decorate' }
  )
)

log(`Processed ${results.length} words through 2 stages`)

return { words, sentences: results }
