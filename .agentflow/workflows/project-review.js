export const meta = {
  name: 'project-review',
  description: 'Review AgentFlow codebase and propose 3 pragmatic improvements',
  phases: [
    { title: 'scan', detail: 'Deep scan of source and tests' },
    { title: 'review', detail: 'Identify top 3 pragmatic improvements' },
  ],
}

phase('scan')

const scanResult = await agent(
  [
    'Read ALL source files in src/ and ALL test files in tests/ of the AgentFlow project at /home/caosen/GitHub/agentflow.',
    '',
    'This is a TypeScript workflow engine that orchestrates AI agents via the CodeBuddy Agent SDK.',
    '',
    'After reading, output a single JSON object with these fields:',
    '  strengths: string[] - what the codebase does well',
    '  weaknesses: string[] - architecture or design gaps',
    '  missingFeatures: string[] - features a workflow engine should have',
    '  issues: string[] - code quality, error handling, testing, performance issues',
    '',
    'Output ONLY the JSON object, no markdown fences, no explanation.',
  ].join('\n'),
  { label: 'scanner', model: 'glm-5.1' },
)

log('Scan complete, parsing result...')

let scan
if (typeof scanResult === 'string') {
  try {
    scan = JSON.parse(scanResult)
  } catch {
    const match = String(scanResult).match(/\{[\s\S]*\}/)
    scan = match ? JSON.parse(match[0]) : { strengths: [], weaknesses: [], missingFeatures: [], issues: [] }
  }
} else if (scanResult && typeof scanResult === 'object') {
  scan = scanResult
} else {
  scan = { strengths: [], weaknesses: [], missingFeatures: [], issues: [] }
}

log('Strengths: ' + (scan.strengths?.length ?? 0))
log('Weaknesses: ' + (scan.weaknesses?.length ?? 0))
log('Missing features: ' + (scan.missingFeatures?.length ?? 0))
log('Issues: ' + (scan.issues?.length ?? 0))

phase('review')

const reviewResult = await agent(
  [
    'You are a senior TypeScript architect. You have scanned the AgentFlow project at /home/caosen/GitHub/agentflow.',
    '',
    'Scan findings:',
    '  Strengths: ' + JSON.stringify(scan.strengths),
    '  Weaknesses: ' + JSON.stringify(scan.weaknesses),
    '  Missing features: ' + JSON.stringify(scan.missingFeatures),
    '  Issues: ' + JSON.stringify(scan.issues),
    '',
    'Now read the actual source files in src/ to verify these findings. Focus on:',
    '  src/core/engine.ts (the heart of the system)',
    '  src/core/agent.ts (SDK adapter)',
    '  src/cli.ts (CLI entry)',
    '  tests/ (test coverage)',
    '',
    'Then propose exactly 3 PRAGMATIC improvements. Criteria:',
    '  - Each implementable in under 2 hours',
    '  - Clear, measurable benefit',
    '  - No "nice to have" — only material improvements',
    '',
    'Output a JSON array with exactly 3 objects, each having:',
    '  title: string (imperative, e.g. "Add retry with backoff to agent calls")',
    '  problem: string (1-2 sentences)',
    '  solution: string (concrete: file names, what to change)',
    '  effortMinutes: number',
    '  impact: "high" | "medium" | "low"',
    '',
    'Output ONLY the JSON array, no markdown fences.',
  ].join('\n'),
  { label: 'reviewer', model: 'glm-5.1' },
)

let improvements
if (typeof reviewResult === 'string') {
  try {
    improvements = JSON.parse(reviewResult)
  } catch {
    const match = String(reviewResult).match(/\[[\s\S]*\]/)
    improvements = match ? JSON.parse(match[0]) : []
  }
} else if (Array.isArray(reviewResult)) {
  improvements = reviewResult
} else {
  improvements = []
}

if (improvements.length === 0) {
  log('No improvements returned, raw result: ' + JSON.stringify(reviewResult)?.slice(0, 200))
}

for (const imp of improvements) {
  log('')
  log('## ' + imp.title)
  log('  Problem: ' + imp.problem)
  log('  Solution: ' + imp.solution)
  log('  Effort: ~' + imp.effortMinutes + 'min | Impact: ' + imp.impact)
}

return improvements
