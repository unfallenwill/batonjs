/**
 * Example 20: Completeness Critic
 * Level: Intermediate
 *
 * The "completeness critic" pattern: after generating initial results,
 * spawn a final agent that asks "what's missing?" Its findings
 * become a second round of work to fill the gaps.
 *
 * Key takeaway: A single pass often misses things. Add a critic
 * that specifically looks for gaps, then do another round
 * to address what the critic found. Repeat until the critic
 * is satisfied or you hit a limit.
 */

export const meta = {
  name: 'completeness-critic',
  description: 'Critic finds gaps, then a second round fills them',
  phases: [
    { title: 'Initial', detail: 'first pass coverage' },
    { title: 'Critique', detail: 'find what is missing' },
    { title: 'Fill Gaps', detail: 'address the gaps' },
  ],
}

const TOPIC = args?.topic || 'REST API design best practices'

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['title', 'detail', 'category'],
      },
    },
  },
  required: ['items'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    missing_categories: {
      type: 'array',
      items: { type: 'string' },
    },
    missing_items: {
      type: 'array',
      items: { type: 'string' },
    },
    coverage_score: { type: 'number', description: '0-100' },
  },
  required: ['missing_categories', 'missing_items', 'coverage_score'],
}

// Round 1: Initial pass
phase('Initial')

const initial = await agent(
  `List the most important best practices for "${TOPIC}". ` +
  `Cover as many categories as you can think of.`,
  { label: 'initial', phase: 'Initial', schema: ITEM_SCHEMA }
)

log(`Initial: ${initial.items.length} items across ${new Set(initial.items.map((i) => i.category)).size} categories`)

// Critic: What's missing?
phase('Critique')

const critique = await agent(
  `You are a completeness critic. Review this list of "${TOPIC}" best practices ` +
  `and identify what is MISSING. What categories were not covered? ` +
  `What important items were omitted?\n\n` +
  `Existing items:\n${initial.items.map((i) => `[${i.category}] ${i.title}`).join('\n')}\n\n` +
  `Existing categories: ${[...new Set(initial.items.map((i) => i.category))].join(', ')}`,
  { label: 'critic', phase: 'Critique', schema: CRITIC_SCHEMA }
)

log(`Critic: coverage ${critique.coverage_score}/100, ${critique.missing_categories.length} missing categories`)

// Round 2: Fill the gaps
phase('Fill Gaps')

if (critique.missing_categories.length > 0) {
  const gapFill = await agent(
    `The initial coverage of "${TOPIC}" was missing these categories: ${critique.missing_categories.join(', ')}.\n` +
    `And these specific items: ${critique.missing_items.join('; ')}.\n\n` +
    `Generate best practices specifically for these MISSING areas.`,
    { label: 'gap-fill', phase: 'Fill Gaps', schema: ITEM_SCHEMA }
  )

  log(`Gap fill: ${gapFill.items.length} additional items`)

  const combined = [...initial.items, ...gapFill.items]
  const categories = [...new Set(combined.map((i) => i.category))]

  return {
    initial: initial.items.length,
    added: gapFill.items.length,
    total: combined.length,
    categories,
    coverageScore: critique.coverage_score,
    items: combined,
  }
}

return { initial: initial.items.length, added: 0, total: initial.items.length, items: initial.items }
