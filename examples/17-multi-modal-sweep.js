/**
 * Example 17: Multi-Modal Sweep
 * Level: Intermediate
 *
 * The "multi-modal sweep" pattern: run parallel agents, each
 * searching a DIFFERENT way (by container, by content, by entity,
 * by time). Each is blind to what the others find.
 *
 * Key takeaway: One search angle won't find everything.
 * Use multiple independent search strategies and merge results.
 * Each agent should have a distinct "lens" or "modality".
 */

export const meta = {
  name: 'multi-modal-sweep',
  description: 'Multiple search strategies running in parallel',
  phases: [
    { title: 'Sweep', detail: 'search from different angles' },
    { title: 'Merge', detail: 'deduplicate and merge' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'What was found' },
          category: { type: 'string', description: 'Category of finding' },
          relevance: { type: 'string', description: 'Why it matters' },
        },
        required: ['item', 'category', 'relevance'],
      },
    },
  },
  required: ['findings'],
}

const QUESTION = 'What are best practices for API error handling?'

phase('Sweep')

// Four different search lenses — each blind to the others
const lenses = await parallel([
  () => agent(
    `Think about API error handling from a CLIENT-SIDE perspective. ` +
    `What patterns should consumers of APIs follow? Question: "${QUESTION}"`,
    { label: 'lens:client', phase: 'Sweep', schema: FINDINGS_SCHEMA }
  ),
  () => agent(
    `Think about API error handling from a SERVER-SIDE perspective. ` +
    `What patterns should API providers implement? Question: "${QUESTION}"`,
    { label: 'lens:server', phase: 'Sweep', schema: FINDINGS_SCHEMA }
  ),
  () => agent(
    `Think about API error handling from a SECURITY perspective. ` +
    `What error-handling mistakes create vulnerabilities? Question: "${QUESTION}"`,
    { label: 'lens:security', phase: 'Sweep', schema: FINDINGS_SCHEMA }
  ),
  () => agent(
    `Think about API error handling from a UX perspective. ` +
    `How should errors be presented to end users? Question: "${QUESTION}"`,
    { label: 'lens:ux', phase: 'Sweep', schema: FINDINGS_SCHEMA }
  ),
])

phase('Merge')

// Merge and deduplicate
const allFindings = lenses
  .filter(Boolean)
  .flatMap((l) => l.findings)

const seen = new Set()
const unique = allFindings.filter((f) => {
  const key = f.item.toLowerCase().slice(0, 50)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

log(`Found ${allFindings.length} total, ${unique.length} unique findings`)

const merged = await agent(
  `Synthesize these ${unique.length} findings about API error handling ` +
  `into a structured best-practices guide with sections:\n\n` +
  unique.map((f) => `[${f.category}] ${f.item}: ${f.relevance}`).join('\n'),
  { label: 'merge', phase: 'Merge' }
)

return { totalFindings: allFindings.length, uniqueFindings: unique.length, guide: merged }
