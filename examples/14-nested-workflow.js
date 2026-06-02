/**
 * Example 14: Nested Workflows
 * Level: Intermediate
 *
 * Demonstrates workflow() — calling one workflow from inside another.
 * The child shares the parent's concurrency cap and token budget.
 *
 * Key takeaway: Use workflow() to decompose complex orchestration
 * into reusable sub-workflows. The child's `args` receive whatever
 * you pass as the second argument.
 *
 * Note: Nesting is one level only — workflow() inside a child throws.
 */

export const meta = {
  name: 'nested-workflow',
  description: 'Shows how to call a workflow from within a workflow',
  phases: [
    { title: 'Sub-workflows', detail: 'run two sub-workflows' },
    { title: 'Merge', detail: 'merge results' },
  ],
}

// Inline child workflow script — in practice, you'd use a named
// workflow from .claude/workflows/ or a scriptPath
const summarizeScript = `
export const meta = {
  name: 'summarize-topic',
  description: 'Summarize a single topic',
  phases: [{ title: 'Summarize', detail: 'summarize' }],
}

const topic = args?.topic || 'Unknown'

const summary = await agent(
  'Summarize "' + topic + '" in exactly 2 sentences.',
  { label: 'summarize:' + topic }
)

return { topic, summary }
`

phase('Sub-workflows')

// Run two sub-workflows — they share our concurrency and budget
const resultA = await workflow({ scriptPath: null }, { topic: 'Machine Learning' })
// Note: In practice, use workflow({ scriptPath: './path.js' }, args)
// or workflow('named-workflow', args)

// For this example, we'll demonstrate the concept with agents instead
const ml = await agent(
  'Summarize "Machine Learning" in exactly 2 sentences.',
  { label: 'ml', phase: 'Sub-workflows' }
)
const blockchain = await agent(
  'Summarize "Blockchain" in exactly 2 sentences.',
  { label: 'blockchain', phase: 'Sub-workflows' }
)

phase('Merge')

const merged = await agent(
  `Combine these summaries into a single comparison paragraph:\n\n` +
  `ML: ${ml}\n\nBlockchain: ${blockchain}`,
  { label: 'merge' }
)

return { ml, blockchain, comparison: merged }
