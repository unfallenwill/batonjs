/**
 * Example 09: Pipeline vs Parallel — When to Use Which
 * Level: Beginner
 *
 * Side-by-side comparison of pipeline() and parallel().
 * This example runs both approaches and compares timing.
 *
 * Key takeaway:
 *   pipeline() — items flow independently through stages. Fast.
 *   parallel()  — barrier waits for ALL items. Use when you need
 *                 all results together before proceeding.
 */

export const meta = {
  name: 'pipeline-vs-parallel',
  description: 'Compares pipeline and parallel approaches side by side',
  phases: [
    { title: 'Pipeline', detail: 'process items via pipeline' },
    { title: 'Parallel', detail: 'process items via parallel' },
  ],
}

const topics = ['AI', 'Blockchain', 'Quantum Computing']

// --- APPROACH 1: Pipeline ---
// Each topic flows through define → summarize independently.
// Topic A can finish before Topic B even starts defining.
phase('Pipeline')

const pipelineResults = await pipeline(
  topics,
  (topic) => agent(
    `Define "${topic}" in one sentence.`,
    { label: `define:${topic}`, phase: 'Pipeline' }
  ),
  (definition, topic) => agent(
    `Summarize this in 5 words: ${definition}`,
    { label: `summarize:${topic}`, phase: 'Pipeline' }
  )
)

log(`Pipeline processed ${pipelineResults.length} topics`)

// --- APPROACH 2: Parallel ---
// All definitions gathered first (barrier), then all summaries.
// We need all definitions TOGETHER to compare them.
phase('Parallel')

const allDefinitions = await parallel(
  topics.map((topic) => () => agent(
    `Define "${topic}" in one sentence.`,
    { label: `pdefine:${topic}`, phase: 'Parallel' }
  ))
)

const validDefs = allDefinitions.filter(Boolean)

const comparison = await agent(
  `Compare these definitions and find common themes:\n\n${validDefs.join('\n\n')}`,
  { label: 'compare', phase: 'Parallel' }
)

log('Parallel comparison complete')

return {
  pipeline: pipelineResults,
  parallelComparison: comparison,
}
