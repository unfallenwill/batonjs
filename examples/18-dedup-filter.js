/**
 * Example 18: Dedup and Filter
 * Level: Intermediate
 *
 * Demonstrates post-processing patterns for workflow results:
 * deduplication, filtering, sorting, and quality gates.
 * These are plain JavaScript — no agents needed.
 *
 * Key takeaway: Not everything needs an agent. Use plain JS
 * for merging, deduping, filtering, and transforming results
 * between agent stages.
 */

export const meta = {
  name: 'dedup-filter',
  description: 'Post-processing: dedup, filter, and rank results',
  phases: [
    { title: 'Collect', detail: 'gather raw suggestions' },
    { title: 'Process', detail: 'dedup, filter, rank' },
  ],
}

const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          impact: { type: 'number', description: '1-10' },
        },
        required: ['title', 'description', 'difficulty', 'impact'],
      },
    },
  },
  required: ['suggestions'],
}

phase('Collect')

// Collect suggestions from two different sources
const sourceA = await agent(
  'Suggest 5 ways to improve developer productivity. Include difficulty and impact (1-10).',
  { label: 'source-a', phase: 'Collect', schema: SUGGESTION_SCHEMA }
)

const sourceB = await agent(
  'Suggest 5 ways to improve developer productivity. Be creative and different. Include difficulty and impact (1-10).',
  { label: 'source-b', phase: 'Collect', schema: SUGGESTION_SCHEMA }
)

phase('Process')

// --- Plain JS post-processing ---

// 1. Merge
const merged = [...(sourceA?.suggestions || []), ...(sourceB?.suggestions || [])]
log(`Raw suggestions: ${merged.length}`)

// 2. Dedup by title similarity (simple prefix match)
const seen = new Set()
const deduped = merged.filter((s) => {
  const key = s.title.toLowerCase().split(' ').slice(0, 3).join(' ')
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
log(`After dedup: ${deduped.length}`)

// 3. Filter: only easy/medium with impact >= 6
const filtered = deduped.filter(
  (s) => s.difficulty !== 'hard' && s.impact >= 6
)
log(`After filter (easy/medium, impact≥6): ${filtered.length}`)

// 4. Sort by impact descending
const ranked = filtered.sort((a, b) => b.impact - a.impact)

// 5. Take top N
const top5 = ranked.slice(0, 5)

log(`Top 5 suggestions selected`)
top5.forEach((s, i) => log(`  ${i + 1}. [${s.difficulty}, impact:${s.impact}] ${s.title}`))

return { total: merged.length, deduped: deduped.length, topPicks: top5 }
