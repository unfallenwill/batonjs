/**
 * Example 05: Arguments (args)
 * Level: Beginner
 *
 * Demonstrates how to use the `args` parameter to pass
 * input into your workflow from the outside.
 *
 * Key takeaway: `args` is a global in the script body.
 * It receives whatever was passed via Workflow({ args: ... }).
 * Always handle the case where args might be undefined.
 *
 * Usage: Workflow({ script, args: { topic: 'TypeScript' } })
 */

export const meta = {
  name: 'arguments',
  description: 'Shows how to accept external input via args',
  phases: [{ title: 'Explain', detail: 'explain the given topic' }],
}

phase('Explain')

// `args` is a global — it's whatever the caller passed in
const topic = args?.topic || 'JavaScript'

log(`Explaining: ${topic}`)

const explanation = await agent(
  `Explain "${topic}" in simple terms. Use 3-4 sentences max.`,
  { label: `explainer:${topic}` }
)

return { topic, explanation }
