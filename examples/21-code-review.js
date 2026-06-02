/**
 * Example 21: Code Review Pipeline
 * Level: Advanced
 *
 * A production-quality code review workflow:
 *   1. Find changed files
 *   2. Review each file across multiple dimensions (bugs, style, security)
 *   3. Adversarially verify each finding
 *   4. Synthesize a final report
 *
 * Key takeaway: Use pipeline for "find → verify per finding" —
 * each file's findings verify as soon as they're ready,
 * without waiting for other files to finish reviewing.
 *
 * Usage: Workflow({ script, args: { files: ['src/auth.ts', 'src/api.ts'] } })
 */

export const meta = {
  name: 'code-review',
  description: 'Multi-dimension code review with adversarial verification',
  phases: [
    { title: 'Review', detail: 'review files across dimensions' },
    { title: 'Verify', detail: 'adversarially verify findings' },
    { title: 'Report', detail: 'synthesize final report' },
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
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['file', 'severity', 'title', 'description', 'suggestion'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    isReal: { type: 'boolean', description: 'Is this a genuine issue?' },
    confidence: { type: 'number', description: '0-1' },
    reason: { type: 'string' },
  },
  required: ['isReal', 'confidence', 'reason'],
}

const files = args?.files || ['src/index.ts']

const REVIEW_DIMENSIONS = [
  { key: 'bugs', prompt: 'Look for logic bugs, off-by-one errors, null dereferences, race conditions' },
  { key: 'security', prompt: 'Look for injection risks, auth issues, data leaks, input validation gaps' },
  { key: 'style', prompt: 'Look for code that is hard to read, poorly named, or violates common conventions' },
]

// Phase 1: Review each file across each dimension (pipeline — no barrier needed)
phase('Review')

const reviews = await pipeline(
  files.flatMap((file) =>
    REVIEW_DIMENSIONS.map((dim) => ({ file, dim }))
  ),
  ({ file, dim }) => agent(
    `Review the file ${file} for issues.\n` +
    `Focus: ${dim.prompt}\n` +
    `Report only genuine, high-confidence issues.`,
    { label: `review:${dim.key}:${file}`, phase: 'Review', schema: FINDINGS_SCHEMA }
  ),
  // Stage 2: Adversarially verify each finding
  (review) => {
    if (!review || !review.findings || review.findings.length === 0) return null
    return parallel(
      review.findings.map((f) => () =>
        agent(
          `A code reviewer claims this issue exists:\n` +
          `File: ${f.file}, Severity: ${f.severity}\n` +
          `Title: ${f.title}\n` +
          `Description: ${f.description}\n\n` +
          `Is this a REAL issue, or a false positive? Be skeptical.`,
          { label: `verify:${f.file}:${f.title.slice(0, 20)}`, phase: 'Verify', schema: VERDICT_SCHEMA }
        )
      )
    ).then((verdicts) =>
      review.findings.map((f, i) => ({
        ...f,
        verdict: verdicts[i],
      }))
    )
  }
)

// Flatten and filter to confirmed findings
const confirmed = reviews
  .filter(Boolean)
  .flatMap((findings) => findings)
  .filter((f) => f.verdict?.isReal)

log(`Found ${confirmed.length} confirmed issues across ${files.length} files`)

// Phase 3: Final report
phase('Report')

const report = await agent(
  `Write a code review summary report for these ${confirmed.length} confirmed issues.\n` +
  `Group by severity (high → medium → low) and suggest an action order.\n\n` +
  confirmed.map((f) =>
    `[${f.severity.toUpperCase()}] ${f.file}: ${f.title}\n  ${f.description}\n  Fix: ${f.suggestion}\n  Confidence: ${f.verdict.confidence}`
  ).join('\n\n'),
  { label: 'report', phase: 'Report' }
)

return { totalFindings: confirmed.length, high: confirmed.filter((f) => f.severity === 'high').length, report }
