/**
 * Example 30: Full Quality Gate
 * Level: Advanced
 *
 * The ultimate workflow — a complete CI quality gate that combines
 * EVERY pattern from the previous examples:
 *
 *   - Parallel multi-vector scanning
 *   - Pipeline find → verify
 *   - Adversarial verification
 *   - Completeness critic
 *   - Budget-aware scaling
 *   - Judge panel for final verdict
 *
 * This represents what a production-grade dynamic workflow looks like.
 *
 * Key takeaway: Complex workflows compose from simple primitives.
 * Each pattern serves one purpose. Combine them thoughtfully,
 * not randomly. The structure should reflect your quality process.
 *
 * Usage: Workflow({ script, args: { target: 'src/', strict: true } })
 */

export const meta = {
  name: 'full-quality-gate',
  description: 'Complete CI quality gate combining all workflow patterns',
  phases: [
    { title: 'Scan', detail: 'parallel multi-vector scan' },
    { title: 'Verify', detail: 'adversarial verification of findings' },
    { title: 'Critic', detail: 'completeness check' },
    { title: 'Judge', detail: 'final quality verdict' },
  ],
}

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          title: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['id', 'category', 'severity', 'title', 'description', 'location', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean' },
    confidence: { type: 'number', description: '0-1' },
    reason: { type: 'string' },
  },
  required: ['confirmed', 'confidence', 'reason'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          what: { type: 'string' },
          severity: { type: 'string' },
        },
        required: ['area', 'what', 'severity'],
      },
    },
    coverageScore: { type: 'number', description: '0-100' },
  },
  required: ['gaps', 'coverageScore'],
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'Does the code pass the quality gate?' },
    score: { type: 'number', description: '0-100 overall quality score' },
    summary: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'Issues that must be fixed' },
    warnings: { type: 'array', items: { type: 'string' }, description: 'Issues to address soon' },
  },
  required: ['pass', 'score', 'summary', 'blockers', 'warnings'],
}

const target = args?.target || 'src/'
const strict = args?.strict !== false  // default true

// Define scan dimensions
const DIMENSIONS = [
  { key: 'bugs', prompt: 'Logic bugs, null dereferences, race conditions, incorrect conditions' },
  { key: 'security', prompt: 'Injection, auth bypass, data exposure, insecure defaults' },
  { key: 'performance', prompt: 'N+1 queries, memory leaks, unnecessary allocations, blocking I/O' },
  { key: 'maintainability', prompt: 'Code duplication, poor naming, deep nesting, god functions' },
]

// ============================================================
// Phase 1: SCAN — parallel multi-vector sweep
// ============================================================
phase('Scan')

const scans = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(
      `Scan ${target} for quality issues.\nFocus: ${d.prompt}\n` +
      `Only report high-confidence findings. Each finding needs a location and fix suggestion.`,
      { label: `scan:${d.key}`, phase: 'Scan', schema: FINDING_SCHEMA }
    )
  )
)

const allFindings = scans.filter(Boolean).flatMap((s) => s.findings)

// Dedup
const seen = new Set()
const uniqueFindings = allFindings.filter((f) => {
  const key = `${f.category}:${f.title}:${f.location}`.slice(0, 80)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

log(`Scan: ${allFindings.length} findings → ${uniqueFindings.length} unique`)

// ============================================================
// Phase 2: VERIFY — adversarial verification per finding
// ============================================================
phase('Verify')

// Only verify critical and high severity to save budget
const toVerify = uniqueFindings.filter((f) =>
  strict ? true : f.severity === 'critical' || f.severity === 'high'
)

const verified = await parallel(
  toVerify.map((finding) => () =>
    parallel([
      () => agent(
        `Try to REFUTE this finding. Is it a real issue?\n${finding.title}: ${finding.description}\nLocation: ${finding.location}`,
        { label: `verify:1:${finding.id}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ),
      () => agent(
        `Challenge this code quality claim:\n${finding.title}: ${finding.description}\nFix suggested: ${finding.fix}`,
        { label: `verify:2:${finding.id}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ),
    ]).then((votes) => {
      const validVotes = votes.filter(Boolean)
      const confirmed = validVotes.filter((v) => v.confirmed)
      return {
        ...finding,
        confirmed: confirmed.length >= 1,
        avgConfidence: validVotes.length > 0
          ? confirmed.reduce((s, v) => s + v.confidence, 0) / validVotes.length
          : 0,
      }
    })
  )
)

const confirmedFindings = [
  ...verified.filter((v) => v?.confirmed),
  // Low/medium findings from non-strict mode are auto-included
  ...uniqueFindings.filter((f) => f.severity === 'low' || f.severity === 'medium').filter((f) => !toVerify.includes(f)),
]

const criticalCount = confirmedFindings.filter((f) => f.severity === 'critical').length
log(`Verified: ${confirmedFindings.length} confirmed (${criticalCount} critical)`)

// ============================================================
// Phase 3: CRITIC — completeness check
// ============================================================
phase('Critic')

const criticResult = await agent(
  `You are a quality gate completeness critic.\n\n` +
  `We scanned ${target} across these dimensions: ${DIMENSIONS.map((d) => d.key).join(', ')}\n` +
  `Found ${confirmedFindings.length} confirmed issues.\n\n` +
  `What areas might we have MISSED? Consider:\n` +
  `- Cross-cutting concerns (logging, error handling, observability)\n` +
  `- Edge cases in the scan dimensions themselves\n` +
  `- Integration issues between modules\n` +
  `- Testing gaps`,
  { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA }
)

log(`Critic: coverage ${criticResult.coverageScore}/100, ${criticResult.gaps.length} gaps identified`)

// ============================================================
// Phase 4: JUDGE — final quality verdict
// ============================================================
phase('Judge')

const verdict = await agent(
  `You are the final quality gate judge.\n\n` +
  `Target: ${target}\n` +
  `Mode: ${strict ? 'strict' : 'normal'}\n\n` +
  `Scan Results:\n` +
  `- Dimensions scanned: ${DIMENSIONS.length}\n` +
  `- Confirmed findings: ${confirmedFindings.length}\n` +
  `- Critical: ${confirmedFindings.filter((f) => f.severity === 'critical').length}\n` +
  `- High: ${confirmedFindings.filter((f) => f.severity === 'high').length}\n` +
  `- Medium: ${confirmedFindings.filter((f) => f.severity === 'medium').length}\n` +
  `- Low: ${confirmedFindings.filter((f) => f.severity === 'low').length}\n\n` +
  `Completeness: ${criticResult.coverageScore}/100\n\n` +
  `Confirmed issues:\n${confirmedFindings.map((f) => `[${f.severity.toUpperCase()}] ${f.title} (${f.location})`).join('\n')}\n\n` +
  `Gaps identified by critic:\n${criticResult.gaps.map((g) => `- [${g.severity}] ${g.area}: ${g.what}`).join('\n')}\n\n` +
  `Render a pass/fail verdict. In ${strict ? 'strict' : 'normal'} mode, ` +
  `${strict ? 'any critical or high issue fails the gate' : 'only critical issues fail the gate'}. ` +
  `Provide a quality score (0-100), blockers, and warnings.`,
  { label: 'judge', phase: 'Judge', schema: JUDGE_SCHEMA }
)

log(`\n${'='.repeat(50)}`)
log(`QUALITY GATE: ${verdict.pass ? '✅ PASSED' : '❌ FAILED'}`)
log(`Score: ${verdict.score}/100`)
log(`Blockers: ${verdict.blockers.length}`)
log(`Warnings: ${verdict.warnings.length}`)
log(`${'='.repeat(50)}`)

return {
  pass: verdict.pass,
  score: verdict.score,
  summary: verdict.summary,
  blockers: verdict.blockers,
  warnings: verdict.warnings,
  findings: {
    total: confirmedFindings.length,
    critical: confirmedFindings.filter((f) => f.severity === 'critical').length,
    high: confirmedFindings.filter((f) => f.severity === 'high').length,
    medium: confirmedFindings.filter((f) => f.severity === 'medium').length,
    low: confirmedFindings.filter((f) => f.severity === 'low').length,
  },
  coverage: criticResult.coverageScore,
  gaps: criticResult.gaps.length,
}
