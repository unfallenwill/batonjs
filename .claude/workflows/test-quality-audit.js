export const meta = {
  name: 'test-quality-audit',
  description: 'Audit the BatonJS test suite for coverage gaps, assertion quality, edge-case blind spots, flakiness risks, and maintainability',
  phases: [
    { title: 'Scan', detail: 'Read all test files and source files under test' },
    { title: 'Review', detail: 'Multi-dimensional test quality review' },
    { title: 'Verify', detail: 'Adversarially verify findings' },
    { title: 'Synthesize', detail: 'Produce final audit report' },
  ],
}

// ── Phase 1: Scan ──────────────────────────────────────────────────────

phase('Scan')

const FILE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    testCount: { type: 'number' },
    describeBlocks: { type: 'number' },
    helpers: {
      type: 'array',
      items: { type: 'string' },
    },
    mockPatterns: {
      type: 'array',
      items: { type: 'string' },
    },
    usesFakeTimers: { type: 'boolean' },
    usesVIMock: { type: 'boolean' },
    assertionStyles: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
  },
  required: ['path', 'testCount', 'summary'],
}

const testFiles = [
  'tests/result.test.ts',
  'tests/events.test.ts',
  'tests/concurrency.test.ts',
  'tests/pipeline.test.ts',
  'tests/budget.test.ts',
  'tests/cli.test.ts',
  'tests/engine.test.ts',
  'tests/agent.test.ts',
]

const sourceFiles = [
  'src/utils/result.ts',
  'src/core/events.ts',
  'src/utils/semaphore.ts',
  'src/utils/parallel.ts',
  'src/utils/pipeline.ts',
  'src/core/budget.ts',
  'src/core/agent.ts',
  'src/core/engine.ts',
  'src/core/context.ts',
  'src/core/sdk.ts',
  'src/cli.ts',
  'src/utils/extract-meta.ts',
  'src/types.ts',
]

log('Scanning test files for structural analysis...')
const scanResults = await parallel(
  testFiles.map((f) => () =>
    agent(
      `Read the file ${f} and analyze its test structure. Report:
1. path: the file path
2. testCount: number of it() test cases
3. describeBlocks: number of describe() blocks
4. helpers: list of test helper functions defined (e.g. makeContext, withScript)
5. mockPatterns: list of mocking patterns used (e.g. "vi.fn() injection", "console spy")
6. usesFakeTimers: whether vi.useFakeTimers() is used
7. usesVIMock: whether vi.mock() module-level mocking is used
8. assertionStyles: list of distinct assertion patterns (e.g. "toEqual deep equality", "toBeNull null check", "toThrow error check")
9. summary: one-paragraph summary of what this test file covers and its testing approach`,
      { label: `scan:${f}`, phase: 'Scan', schema: FILE_SCHEMA },
    ),
  ),
)

log('Scanning source files for coverage gap analysis...')
const sourceAnalysis = await parallel(
  sourceFiles.map((f) => () =>
    agent(
      `Read the source file ${f} and identify ALL exported functions, classes, and their public methods/branches. For each:
1. List every function/method name
2. List every branch point (if/else, switch, ternary, optional chaining with fallback, early returns)
3. List every error handling path (try/catch, Result return patterns)
4. Note any edge cases that would be tricky to test

Return a comprehensive list of ALL testable behaviors and edge cases.`,
      { label: `source:${f}`, phase: 'Scan' },
    ),
  ),
)

// ── Phase 2: Multi-dimensional Review ──────────────────────────────────

phase('Review')

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          title: { type: 'string' },
          file: { type: 'string' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'title', 'description'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['dimension', 'findings', 'summary'],
}

const DIMENSIONS = [
  {
    key: 'coverage-gaps',
    prompt: `You are a test coverage auditor for the BatonJS project. Based on the scan results below, identify missing test coverage.

SCAN RESULTS:
${JSON.stringify(scanResults.filter(Boolean), null, 2)}

SOURCE ANALYSIS:
${sourceAnalysis.filter(Boolean).join('\n\n')}

Specifically look for:
1. Source files with NO corresponding test file
2. Exported functions/methods that are never tested
3. Error handling paths (catch blocks, Result error returns) without test coverage
4. Branch conditions that no test exercises (unreadable else branches, untested switch cases)
5. Edge cases in core modules (semaphore, pipeline, budget, agent) that lack dedicated tests
6. The extract-meta.ts module — does it have dedicated tests?

Severity guide:
- critical: entire module untested, or critical error path untested
- high: important branch or edge case untested
- medium: minor edge case or defensive path untested
- low: nice-to-have coverage improvement`,
  },
  {
    key: 'assertion-quality',
    prompt: `You are a test assertion quality reviewer for the BatonJS project. Analyze the test files for assertion quality issues.

TEST FILE ANALYSES:
${JSON.stringify(scanResults.filter(Boolean), null, 2)}

Specifically look for:
1. Weak assertions: tests that only check result is not null/undefined without verifying actual values
2. Overly broad assertions: using toBeTruthy/toBeFalsy where toBe(true/false) or toEqual would be more precise
3. Missing negative assertions: tests that verify the happy path but don't verify error states don't occur
4. Assertion coupling: tests that assert on implementation details rather than behavior
5. Duplicated test logic: tests that test the same thing twice (e.g. agent.test.ts has two tests for "plain text response")
6. Tests where the assertion could pass even if the code is broken (tautological assertions)
7. Use of `as unknown as` type assertions — are they hiding real issues?

Severity guide:
- critical: test provides false confidence (always passes)
- high: weak assertion that could miss real bugs
- medium: imprecise assertion or missing negative check
- low: style improvement for assertion clarity`,
  },
  {
    key: 'flakiness-risk',
    prompt: `You are a test flakiness auditor for the BatonJS project. Identify potential sources of test flakiness and isolation problems.

TEST FILE ANALYSES:
${JSON.stringify(scanResults.filter(Boolean), null, 2)}

Specifically look for:
1. Shared mutable state between tests (module-level variables like queryMock, capturedSdkOpts)
2. Fake timers that might not be properly cleaned up in all code paths
3. Test ordering dependencies — could tests fail if run in a different order?
4. Race conditions in concurrent tests (budget.test.ts has concurrent agent tests)
5. File system tests (engine.test.ts) — are temp files properly cleaned up? Could parallel test runs conflict?
6. Tests relying on timing (vi.advanceTimersByTimeAsync) — are the timing values robust or could they break with minor code changes?
7. Mock state leaking between tests — is beforeEach cleanup thorough enough?
8. The withScript helper uses Date.now() for unique names — could this collide under fast execution?

Severity guide:
- critical: will definitely cause intermittent failures
- high: likely to cause flakiness under load or parallel execution
- medium: could cause issues in specific CI environments
- low: theoretical risk, unlikely in practice`,
  },
  {
    key: 'maintainability',
    prompt: `You are a test maintainability reviewer for the BatonJS project. Assess how easy the tests are to understand, modify, and extend.

TEST FILE ANALYSES:
${JSON.stringify(scanResults.filter(Boolean), null, 2)}

Specifically look for:
1. Test readability: are test names descriptive? Can you understand what's being tested without reading the body?
2. Test setup complexity: are helper functions well-structured? Is test setup boilerplate minimal?
3. Magic numbers: are there unexplained constants (e.g. 120_000 for timeout, 0.01 for cost)?
4. Test length: are any individual tests too long or doing too much?
5. DRY vs explicit trade-off: is there too much abstraction in helpers, or too much copy-paste?
6. Comment quality: do section comments (like "// -- (a) Success with JSON result --") add value or clutter?
7. Missing tests for new features: the schema validation and structured output features — are they sufficiently tested?
8. Are test types (MockMessage interface) well-defined or using loose types?

Severity guide:
- critical: test is actively misleading or impossible to maintain
- high: significant maintainability burden
- medium: could be improved for clarity
- low: minor style or naming improvement`,
  },
]

log('Running multi-dimensional test quality review...')
const reviews = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  ),
)

// ── Phase 3: Adversarial Verification ──────────────────────────────────

phase('Verify')

log('Verifying findings with adversarial reviewers...')
const allFindings = reviews
  .filter(Boolean)
  .flatMap((r) => r.findings.map((f) => ({ ...f, dimension: r.dimension })))

// Deduplicate findings that mention the same file+issue
const seen = new Set()
const uniqueFindings = allFindings.filter((f) => {
  const key = `${f.file}:${f.title}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

log(`Verifying ${uniqueFindings.length} unique findings...`)

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    finding: { type: 'string' },
    confirmed: { type: 'boolean' },
    reason: { type: 'string' },
    adjustedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
  },
  required: ['finding', 'confirmed', 'reason'],
}

const verified = await pipeline(
  uniqueFindings,
  (finding) =>
    agent(
      `You are an adversarial test quality verifier. Your job is to REFUTE findings that are wrong, exaggerate issues, or misunderstand the code.

FINDING TO VERIFY:
- Dimension: ${finding.dimension}
- Severity: ${finding.severity}
- Title: ${finding.title}
- File: ${finding.file}
- Description: ${finding.description}
- Suggestion: ${finding.suggestion}

Read the relevant source and test files to check:
1. Is this finding factually correct? (Read the actual files to confirm)
2. Is the severity appropriate? (Not too high or too low)
3. Is the suggestion actionable and reasonable?

Default to confirmed=false if the finding is based on a misunderstanding of the code.`,
      { label: `verify:${finding.file}:${finding.title.slice(0, 30)}`, phase: 'Verify', schema: VERDICT_SCHEMA },
    ),
  (verdict, finding) => ({
    ...finding,
    verified: verdict?.confirmed ?? false,
    verdictReason: verdict?.reason ?? 'no verdict',
    adjustedSeverity: verdict?.adjustedSeverity ?? finding.severity,
  }),
)

const confirmed = verified.filter((v) => v.verified)

log(`${confirmed.length}/${uniqueFindings.length} findings confirmed after adversarial review`)

// ── Phase 4: Synthesize ────────────────────────────────────────────────

phase('Synthesize')

log('Generating final audit report...')

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        totalTestFiles: { type: 'number' },
        totalTests: { type: 'number' },
        totalFindings: { type: 'number' },
        confirmedFindings: { type: 'number' },
        bySeverity: {
          type: 'object',
          properties: {
            critical: { type: 'number' },
            high: { type: 'number' },
            medium: { type: 'number' },
            low: { type: 'number' },
          },
        },
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    topIssues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string' },
          dimension: { type: 'string' },
          title: { type: 'string' },
          file: { type: 'string' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'dimension', 'title', 'description'],
      },
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'stats', 'strengths', 'topIssues', 'recommendations'],
}

const report = await agent(
  `You are a senior test quality auditor. Produce a final audit report for the BatonJS project's test suite.

## Scan Summary
Test files analyzed: ${testFiles.length}
Source files analyzed: ${sourceFiles.length}
Total test cases identified: ${scanResults.filter(Boolean).reduce((sum, r) => sum + (r.testCount || 0), 0)}

## Review Dimensions
${DIMENSIONS.map((d) => `- ${d.key}`).join('\n')}

## Confirmed Findings (${confirmed.length} total)
${JSON.stringify(confirmed, null, 2)}

## Requirements
Produce a report with:
1. summary: 2-3 sentence executive summary of the test suite's overall health
2. stats: counts as described in the schema
3. strengths: 3-5 things the test suite does well
4. topIssues: the confirmed findings, sorted by severity (critical first), limited to the most important ones
5. recommendations: 3-5 actionable recommendations for improving test quality, prioritized by impact`,
  { label: 'synthesize', phase: 'Synthesize', schema: REPORT_SCHEMA },
)

return report
