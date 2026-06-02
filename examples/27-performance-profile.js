/**
 * Example 27: Performance Profiler
 * Level: Advanced
 *
 * Analyzes code for performance issues using multiple lenses:
 * algorithmic complexity, memory patterns, I/O bottlenecks,
 * and bundle size. Each finding gets a severity score and
 * suggested fix.
 *
 * Key takeaway: Performance analysis needs domain-specific
 * lenses. A single "find perf issues" prompt misses things
 * that dedicated algorithmic/memory/IO lenses catch.
 *
 * Usage: Workflow({ script, args: { files: ['src/core.ts'] } })
 */

export const meta = {
  name: 'performance-profiler',
  description: 'Multi-lens performance analysis with prioritized fixes',
  phases: [
    { title: 'Profile', detail: 'analyze for performance issues' },
    { title: 'Prioritize', detail: 'rank fixes by impact' },
    { title: 'Suggest', detail: 'generate optimization guide' },
  ],
}

const PERF_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          location: { type: 'string' },
          category: { type: 'string', enum: ['algorithmic', 'memory', 'io', 'bundle', 'rendering'] },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          currentComplexity: { type: 'string', description: 'e.g., O(n²)' },
          suggestedComplexity: { type: 'string', description: 'e.g., O(n log n)' },
          description: { type: 'string' },
          fix: { type: 'string' },
          estimatedImpact: { type: 'string', description: 'e.g., "2-5x faster for large inputs"' },
        },
        required: ['title', 'location', 'category', 'severity', 'description', 'fix', 'estimatedImpact'],
      },
    },
  },
  required: ['issues'],
}

const files = args?.files || ['src/']

const LENSES = [
  { key: 'algorithmic', prompt: 'Algorithmic complexity: nested loops, recursive explosions, unnecessary sorting, brute force approaches' },
  { key: 'memory', prompt: 'Memory issues: excessive allocations, retained references, large object creation in hot paths, memory leaks' },
  { key: 'io', prompt: 'I/O bottlenecks: synchronous file reads, missing batching, unnecessary network calls, unbuffered streams' },
  { key: 'bundle', prompt: 'Bundle size: large imports, tree-shaking failures, duplicated code, unnecessary dependencies' },
]

// Phase 1: Profile with multiple lenses
phase('Profile')

const profiles = await parallel(
  LENSES.map((lens) => () =>
    agent(
      `Analyze ${files.join(', ')} for performance issues.\n` +
      `Focus on: ${lens.prompt}\n` +
      `For each issue, estimate the current complexity and suggested improvement.`,
      { label: `profile:${lens.key}`, phase: 'Profile', schema: PERF_SCHEMA }
    )
  )
)

const allIssues = profiles.filter(Boolean).flatMap((p) => p.issues)
log(`Found ${allIssues.length} performance issues across ${LENSES.length} lenses`)

// Dedup
const seen = new Set()
const unique = allIssues.filter((i) => {
  const key = `${i.location}:${i.title}`.slice(0, 60)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
log(`${unique.length} unique issues after dedup`)

// Phase 2: Prioritize by impact
phase('Prioritize')

const ranked = unique.sort((a, b) => {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
})

const topIssues = ranked.slice(0, 10)
log(`Top ${topIssues.length} issues selected`)

// Phase 3: Generate optimization guide
phase('Suggest')

const guide = await agent(
  `Create a performance optimization guide based on these ${topIssues.length} prioritized issues.\n` +
  `For each issue, provide:\n` +
  `1. What's wrong (for non-experts)\n` +
  `2. The fix (with code example)\n` +
  `3. Expected impact\n` +
  `4. Risk of applying the fix\n\n` +
  topIssues.map((issue, i) =>
    `${i + 1}. [${issue.severity.toUpperCase()}][${issue.category}] ${issue.title}\n` +
    `   Location: ${issue.location}\n` +
    `   ${issue.description}\n` +
    `   Fix: ${issue.fix}\n` +
    `   Impact: ${issue.estimatedImpact}`
  ).join('\n\n'),
  { label: 'perf-guide', phase: 'Suggest' }
)

return {
  totalIssues: allIssues.length,
  uniqueIssues: unique.length,
  topIssues: topIssues.length,
  byCategory: LENSES.map((l) => ({
    category: l.key,
    count: unique.filter((i) => i.category === l.key).length,
  })),
  guide,
}
