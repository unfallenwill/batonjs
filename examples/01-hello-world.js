/**
 * Example 01: Hello World
 * Level: Beginner
 *
 * The simplest possible dynamic workflow.
 * Spawns a single agent and returns its result.
 *
 * Key takeaway: Every workflow must export a `meta` object
 * and use the script body to orchestrate agents.
 */

export const meta = {
  name: 'hello-world',
  description: 'The simplest workflow — one agent, one result',
  phases: [{ title: 'Greet', detail: 'generate a greeting' }],
}

phase('Greet')

const result = await agent('Say hello to the world in a creative way. Respond with a single greeting message.')

log('Greeting generated!')

return result
