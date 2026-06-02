/**
 * Example 22: Iterative Bug Discovery
 * Level: Advanced
 *
 * Combines loop-until-dry with adversarial verification and
 * multi-modal sweep. Each round uses different finder strategies,
 * deduplicates against seen findings, and verifies fresh ones.
 *
 * Key takeaway: Complex patterns compose naturally. This workflow
 * combines: multi-modal sweep + loop-until-dry + dedup +
 * adversarial verify. Each pattern serves a distinct purpose.
 *
 * Usage: Workflow({ script, args: { target: 'src/auth/' } })
 */

export const meta = {
  name: 'bug-discovery',
  description: 'Iterative multi-lens bug finding with adversarial verification',
  phases: [
    { title: 'Find', detail: 'search for bugs' },
    { title: 'Verify', detail: 'verify findings' },
    { title: 'Report', detail: 'compile bug report' },
  ],
}

const BUG_SCHEMA = {
  type: 'object',
  properties: {
    bugs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          file: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          reproduction: { type: 'string' },
        },
        required: ['description', 'file', 'severity', 'reproduction'],
      },
    },
  },
  required: ['bugs'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['real', 'reason'],
}

const target = args?.target || 'src/'
const FINDERS = [
  { lens: 'logic', prompt: 'Look for logic errors: wrong conditions, missing edge cases, incorrect algorithms' },
  { lens: 'null-safety', prompt: 'Look for null/undefined dereferences, missing null checks, unsafe property access' },
  { lens: 'concurrency', prompt: 'Look for race conditions, deadlocks, missing synchronization, async errors' },
]

const seen = new Set()
const confirmed = []
let dry = 0
const MAX_DRY = 2

while (dry < MAX_DRY) {
  // Phase: Find — parallel multi-modal sweep
  phase('Find')

  const found = (await parallel(
    FINDERS.map((f) => () =>
      agent(
        `Search for bugs in ${target}.\nFocus: ${f.prompt}\n` +
        `Report only high-confidence bugs with clear reproduction steps.`,
        { label: `find:${f.lens}:round-${confirmed.length}`, phase: 'Find', schema: BUG_SCHEMA }
      )
    )
  )).filter(Boolean).flatMap((r) => r.bugs)

  // Dedup against ALL seen findings
  const fresh = found.filter((b) => {
    const key = `${b.file}:${b.description.slice(0, 40)}`
    return !seen.has(key)
  })

  if (fresh.length === 0) {
    dry++
    log(`Dry round (${dry}/${MAX_DRY}) — no new bugs`)
    continue
  }

  dry = 0
  fresh.forEach((b) => seen.add(`${b.file}:${b.description.slice(0, 40)}`))

  // Phase: Verify — adversarial verification with 2 skeptics per bug
  phase('Verify')

  const judged = await parallel(
    fresh.map((bug) => () =>
      parallel([
        () => agent(
          `Try to refute this bug report. Is it a real bug or a false positive?\n` +
          `File: ${bug.file}\nBug: ${bug.description}\nRepro: ${bug.reproduction}`,
          { label: `verify:1:${bug.file}`, phase: 'Verify', schema: VERDICT_SCHEMA }
        ),
        () => agent(
          `Challenge this bug claim. Could it be intentional behavior?\n` +
          `File: ${bug.file}\nBug: ${bug.description}\nRepro: ${bug.reproduction}`,
          { label: `verify:2:${bug.file}`, phase: 'Verify', schema: VERDICT_SCHEMA }
        ),
      ]).then((votes) => ({
        bug,
        real: votes.filter(Boolean).filter((v) => v.real).length >= 1,
      }))
    )
  )

  const newlyConfirmed = judged.filter((j) => j?.real).map((j) => j.bug)
  confirmed.push(...newlyConfirmed)

  log(`Round done: ${fresh.length} fresh → ${newlyConfirmed.length} confirmed (total: ${confirmed.length})`)
}

// Phase: Report
phase('Report')

const report = await agent(
  `Compile a bug report from these ${confirmed.length} confirmed bugs:\n\n` +
  confirmed.map((b, i) =>
    `${i + 1}. [${b.severity.toUpperCase()}] ${b.file}: ${b.description}\n   Repro: ${b.reproduction}`
  ).join('\n\n'),
  { label: 'bug-report', phase: 'Report' }
)

return { totalConfirmed: confirmed.length, rounds: seen.size, report, bugs: confirmed }
