/**
 * Example 16: Judge Panel
 * Level: Intermediate
 *
 * The "judge panel" pattern: generate N independent attempts from
 * different angles, then score each one and synthesize from the
 * winner while grafting the best ideas from runners-up.
 *
 * Key takeaway: When the solution space is wide, one attempt isn't
 * enough. Generate diverse approaches, let judges score them,
 * then synthesize the best parts together.
 */

export const meta = {
  name: 'judge-panel',
  description: 'Multiple approaches scored by a judge panel',
  phases: [
    { title: 'Generate', detail: 'generate diverse approaches' },
    { title: 'Judge', detail: 'score each approach' },
    { title: 'Synthesize', detail: 'combine the best ideas' },
  ],
}

const SOLUTION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    approach: { type: 'string', description: 'Strategy description' },
    solution: { type: 'string', description: 'The actual solution text' },
  },
  required: ['title', 'approach', 'solution'],
}

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          clarity: { type: 'number', description: '1-10' },
          creativity: { type: 'number', description: '1-10' },
          practicality: { type: 'number', description: '1-10' },
          total: { type: 'number' },
        },
        required: ['title', 'clarity', 'creativity', 'practicality', 'total'],
      },
    },
    winner: { type: 'string', description: 'Title of the winning approach' },
    reasoning: { type: 'string' },
  },
  required: ['scores', 'winner', 'reasoning'],
}

const TOPIC = 'How to make code reviews more effective'

// Phase 1: Generate 3 diverse approaches
phase('Generate')

const approaches = await parallel([
  () => agent(
    `Solve this problem from a PROCESS perspective (workflows, checklists, rules): "${TOPIC}"`,
    { label: 'process-approach', phase: 'Generate', schema: SOLUTION_SCHEMA }
  ),
  () => agent(
    `Solve this problem from a TOOLING perspective (automation, AI, integrations): "${TOPIC}"`,
    { label: 'tooling-approach', phase: 'Generate', schema: SOLUTION_SCHEMA }
  ),
  () => agent(
    `Solve this problem from a PEOPLE perspective (culture, motivation, communication): "${TOPIC}"`,
    { label: 'people-approach', phase: 'Generate', schema: SOLUTION_SCHEMA }
  ),
])

const validApproaches = approaches.filter(Boolean)
log(`Generated ${validApproaches.length} diverse approaches`)

// Phase 2: Judge scores each approach
phase('Judge')

const judgment = await agent(
  `Score these approaches on clarity (1-10), creativity (1-10), practicality (1-10). ` +
  `Pick a winner and explain your choice.\n\n` +
  validApproaches.map((a) => `[${a.title}] (${a.approach}):\n${a.solution}`).join('\n\n---\n\n'),
  { label: 'judge', phase: 'Judge', schema: SCORE_SCHEMA }
)

log(`Winner: ${judgment.winner} (score: ${judgment.scores.find((s) => s.title === judgment.winner)?.total})`)

// Phase 3: Synthesize — combine winner with best ideas from others
phase('Synthesize')

const synthesis = await agent(
  `The winning approach is "${judgment.winner}".\n\n` +
  `Write a final recommendation that uses the winning approach as the backbone ` +
  `but incorporates the best ideas from the other approaches.\n\n` +
  `All approaches:\n${validApproaches.map((a) => `[${a.title}] ${a.solution}`).join('\n\n')}\n\n` +
  `Judgment: ${judgment.reasoning}`,
  { label: 'synthesizer', phase: 'Synthesize' }
)

return { approaches: validApproaches, judgment, synthesis }
