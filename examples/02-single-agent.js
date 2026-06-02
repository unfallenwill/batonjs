/**
 * Example 02: Single Agent with Return Value
 * Level: Beginner
 *
 * Demonstrates that agent() returns the subagent's final text
 * as a string. You can use this value in subsequent logic.
 *
 * Key takeaway: agent() is async — always `await` it.
 * The return value is the agent's final text output.
 */

export const meta = {
  name: 'single-agent',
  description: 'Shows how agent() returns a usable string value',
  phases: [{ title: 'Generate', detail: 'generate a haiku' }],
}

phase('Generate')

const haiku = await agent(
  'Write a haiku about programming. Respond with ONLY the haiku, nothing else.',
  { label: 'haiku-writer' }
)

log(`Generated haiku:\n${haiku}`)

return { poem: haiku, length: haiku.length }
