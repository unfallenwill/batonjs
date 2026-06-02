/**
 * Example 08: Parallel Basics
 * Level: Beginner
 *
 * Demonstrates parallel() — the BARRIER primitive.
 * ALL thunks must complete before parallel() returns.
 * If any thunk throws, it resolves to null in the result array.
 *
 * Key takeaway: Use parallel() ONLY when stage N genuinely needs
 * ALL results from stage N-1 together. For independent processing,
 * prefer pipeline().
 *
 * parallel([() => agent(...), () => agent(...), ...])
 */

export const meta = {
  name: 'parallel-basic',
  description: 'Shows parallel() running tasks with a barrier',
  phases: [{ title: 'Analyze', detail: 'analyze from multiple angles' }],
}

phase('Analyze')

// We want ALL analyses together before synthesizing — barrier is correct
const analyses = await parallel([
  () => agent(
    'What are 2 strengths of TypeScript? Be brief.',
    { label: 'strengths', phase: 'Analyze' }
  ),
  () => agent(
    'What are 2 weaknesses of TypeScript? Be brief.',
    { label: 'weaknesses', phase: 'Analyze' }
  ),
  () => agent(
    'What are 2 unique features of TypeScript? Be brief.',
    { label: 'unique', phase: 'Analyze' }
  ),
])

// Filter out any nulls from failed agents
const valid = analyses.filter(Boolean)

log(`Collected ${valid.length}/3 analyses`)

// Now synthesize — this is why we needed the barrier
const summary = await agent(
  `Synthesize these TypeScript analyses into a balanced summary:\n\n${valid.join('\n\n')}`,
  { label: 'synthesizer' }
)

return summary
