/**
 * Example 12: Loop Until Dry
 * Level: Intermediate
 *
 * The "loop-until-dry" pattern: keep discovering items until
 * K consecutive rounds return nothing new. This catches the
 * long tail that a fixed-count loop would miss.
 *
 * Key takeaway: Simple counters (while count < N) miss the tail.
 * Use a "dry streak" counter instead — stop only when you've
 * tried multiple times and found nothing new.
 */

export const meta = {
  name: 'loop-until-dry',
  description: 'Discovery loop that keeps searching until exhausted',
  phases: [
    { title: 'Discover', detail: 'find unique ideas' },
    { title: 'Summarize', detail: 'summarize all findings' },
  ],
}

const IDEA_SCHEMA = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    },
  },
  required: ['ideas'],
}

const seen = new Set()
const allIdeas = []
let dryStreak = 0
const MAX_DRY = 2  // Stop after 2 consecutive rounds with no new ideas

phase('Discover')

while (dryStreak < MAX_DRY) {
  const batch = await agent(
    `Suggest 3 creative names for a coding assistant tool. ` +
    `Do NOT repeat any of these already-seen names: [${[...seen].join(', ')}]. ` +
    `Return unique, fresh ideas.`,
    { label: `discover-round-${allIdeas.length}`, schema: IDEA_SCHEMA, phase: 'Discover' }
  )

  const fresh = batch.ideas.filter((idea) => !seen.has(idea.name))

  if (fresh.length === 0) {
    dryStreak++
    log(`Dry round (${dryStreak}/${MAX_DRY}) — no new ideas found`)
  } else {
    dryStreak = 0
    fresh.forEach((idea) => seen.add(idea.name))
    allIdeas.push(...fresh)
    log(`Found ${fresh.length} new ideas (total: ${allIdeas.length})`)
  }
}

log(`Discovery complete: ${allIdeas.length} unique ideas in ${seen.size} names`)

phase('Summarize')

const summary = await agent(
  `Summarize these ${allIdeas.length} coding assistant name ideas into 3 categories:\n` +
  allIdeas.map((i) => `- ${i.name}: ${i.description}`).join('\n'),
  { label: 'summarize', phase: 'Summarize' }
)

return { totalIdeas: allIdeas.length, ideas: allIdeas, summary }
