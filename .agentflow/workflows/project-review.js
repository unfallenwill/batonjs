export const meta = {
  name: 'project-review',
  description: 'Review AgentFlow codebase and propose 3 pragmatic improvements',
  phases: [
    { title: 'scan', detail: 'Deep scan of source and tests' },
    { title: 'review', detail: 'Identify top 3 pragmatic improvements' },
  ],
}

// ── Schemas ───────────────────────────────────────────────────
const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    strengths: {
      type: 'array',
      items: { type: 'string', description: 'What the codebase does well' },
    },
    weaknesses: {
      type: 'array',
      items: { type: 'string', description: 'Architecture or design gaps' },
    },
    missingFeatures: {
      type: 'array',
      items: { type: 'string', description: 'Features a workflow engine should have' },
    },
    issues: {
      type: 'array',
      items: { type: 'string', description: 'Code quality, error handling, testing, performance issues' },
    },
  },
  required: ['strengths', 'weaknesses', 'missingFeatures', 'issues'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    improvements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Imperative, e.g. "Add retry with backoff to agent calls"',
          },
          problem: { type: 'string', description: '1-2 sentences describing the issue' },
          solution: {
            type: 'string',
            description: 'Concrete: file names, what to change',
          },
          effortMinutes: { type: 'number', description: 'Estimated effort in minutes' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'problem', 'solution', 'effortMinutes', 'impact'],
      },
    },
  },
  required: ['improvements'],
}

// ── Phase 1: Scan ─────────────────────────────────────────────

phase('scan')

const scan = await agent(
  [
    'Read ALL source files in src/ and ALL test files in tests/ of the AgentFlow project at /home/caosen/GitHub/agentflow.',
    '',
    'This is a TypeScript workflow engine that orchestrates AI agents via the CodeBuddy Agent SDK.',
    '',
    'Analyze and report:',
    '  - strengths: what the codebase does well',
    '  - weaknesses: architecture or design gaps',
    '  - missingFeatures: features a workflow engine should have',
    '  - issues: code quality, error handling, testing, performance issues',
  ].join('\n'),
  { label: 'scanner', model: 'glm-5.1', schema: SCAN_SCHEMA },
)

if (!scan) {
  log('Scan failed, aborting.')
  return []
}

log('Strengths: ' + (scan.strengths?.length ?? 0))
log('Weaknesses: ' + (scan.weaknesses?.length ?? 0))
log('Missing features: ' + (scan.missingFeatures?.length ?? 0))
log('Issues: ' + (scan.issues?.length ?? 0))

// ── Phase 2: Review ───────────────────────────────────────────

phase('review')

const review = await agent(
  [
    'You are a senior TypeScript architect reviewing the AgentFlow project at /home/caosen/GitHub/agentflow.',
    '',
    'Scan findings:',
    '  Strengths: ' + JSON.stringify(scan.strengths),
    '  Weaknesses: ' + JSON.stringify(scan.weaknesses),
    '  Missing features: ' + JSON.stringify(scan.missingFeatures),
    '  Issues: ' + JSON.stringify(scan.issues),
    '',
    'Read the actual source files to verify these findings. Focus on:',
    '  src/core/engine.ts (the heart of the system)',
    '  src/core/agent.ts (SDK adapter)',
    '  src/core/budget.ts (budget tracking)',
    '  src/utils/ (utility modules)',
    '  tests/ (test coverage)',
    '',
    'Propose exactly 3 PRAGMATIC improvements. Criteria:',
    '  - Each implementable in under 2 hours',
    '  - Clear, measurable benefit',
    '  - No "nice to have" — only material improvements',
  ].join('\n'),
  { label: 'reviewer', model: 'glm-5.1', schema: REVIEW_SCHEMA },
)

const improvements = review?.improvements ?? []

if (improvements.length === 0) {
  log('No improvements returned.')
  return []
}

for (const imp of improvements) {
  log('')
  log('## ' + imp.title)
  log('  Problem: ' + imp.problem)
  log('  Solution: ' + imp.solution)
  log('  Effort: ~' + imp.effortMinutes + 'min | Impact: ' + imp.impact)
}

return improvements
