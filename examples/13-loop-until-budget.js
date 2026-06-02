/**
 * Example 13: Loop Until Budget
 * Level: Intermediate
 *
 * The "loop-until-budget" pattern: scale the number of agents
 * based on the user's token budget directive (e.g., "+500k").
 * Each round checks remaining budget and stops when exhausted.
 *
 * Key takeaway: budget.total is null if no target was set.
 * Always guard with `budget.total &&` before entering the loop.
 * Use budget.remaining() to decide whether to continue.
 */

export const meta = {
  name: 'loop-until-budget',
  description: 'Scale agent count based on token budget',
  phases: [
    { title: 'Generate', detail: 'generate facts within budget' },
  ],
}

const FACT_SCHEMA = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['claim', 'source'],
      },
    },
  },
  required: ['facts'],
}

const allFacts = []
let round = 0

phase('Generate')

// Only loop if the user set an explicit budget target
if (budget.total) {
  log(`Budget: ${Math.round(budget.total / 1000)}k tokens allocated`)

  while (budget.remaining() > 50_000) {
    round++
    const result = await agent(
      `Give me 2 surprising facts about space exploration. ` +
      `Make them different from these already found: ${allFacts.map((f) => f.claim).join('; ') || 'none yet'}`,
      { label: `fact-round-${round}`, schema: FACT_SCHEMA, phase: 'Generate' }
    )

    if (result && result.facts) {
      allFacts.push(...result.facts)
      const remaining = Math.round(budget.remaining() / 1000)
      log(`Round ${round}: found ${result.facts.length} facts (${remaining}k tokens remaining)`)
    }
  }

  log(`Budget exhausted. ${allFacts.length} facts in ${round} rounds.`)
} else {
  // No budget set — just run a single round
  log('No budget target set. Running single round.')
  const result = await agent(
    'Give me 5 surprising facts about space exploration.',
    { label: 'facts-single', schema: FACT_SCHEMA, phase: 'Generate' }
  )
  if (result && result.facts) {
    allFacts.push(...result.facts)
  }
}

return { totalFacts: allFacts.length, rounds: round, facts: allFacts }
