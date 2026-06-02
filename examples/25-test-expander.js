/**
 * Example 25: Test Coverage Expander
 * Level: Advanced
 *
 * Discovers untested code paths and generates test cases.
 * Uses pipeline for find → generate → verify per file,
 * with the completeness critic to catch missed paths.
 *
 * Key takeaway: Test generation benefits from the pipeline pattern —
 * find gaps → generate tests → verify they compile. The critic
 * ensures you don't stop at obvious paths.
 *
 * Usage: Workflow({ script, args: { files: ['src/auth.ts'] } })
 */

export const meta = {
  name: 'test-expander',
  description: 'Discovers untested paths and generates test cases',
  phases: [
    { title: 'Analyze', detail: 'find untested code paths' },
    { title: 'Generate', detail: 'write test cases' },
    { title: 'Verify', detail: 'verify test quality' },
    { title: 'Critic', detail: 'check for missed paths' },
  ],
}

const GAPS_SCHEMA = {
  type: 'object',
  properties: {
    untestedPaths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          function: { type: 'string' },
          path: { type: 'string', description: 'The untested execution path' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          reason: { type: 'string' },
        },
        required: ['function', 'path', 'priority', 'reason'],
      },
    },
  },
  required: ['untestedPaths'],
}

const TEST_SCHEMA = {
  type: 'object',
  properties: {
    tests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          code: { type: 'string', description: 'The test code' },
          covers: { type: 'string', description: 'What this test covers' },
        },
        required: ['name', 'code', 'covers'],
      },
    },
  },
  required: ['tests'],
}

const files = args?.files || ['src/index.ts']

// Phase 1: Analyze — find untested paths per file
phase('Analyze')

const analyses = await parallel(
  files.map((file) => () =>
    agent(
      `Read ${file} and identify untested or undertested code paths. ` +
      `Look for: missing error paths, edge cases, boundary conditions, ` +
      `happy path vs sad path coverage.`,
      { label: `analyze:${file}`, phase: 'Analyze', schema: GAPS_SCHEMA }
    )
  )
)

const allGaps = analyses.filter(Boolean).flatMap((a) => a.untestedPaths)
log(`Found ${allGaps.length} untested paths across ${files.length} files`)

// Phase 2: Generate — write tests for each gap
phase('Generate')

const testsByFile = await pipeline(
  files,
  (file) => {
    const fileGaps = allGaps.filter((g) => file.includes(g.function) || !g.function.includes('/'))
    return { file, gaps: fileGaps }
  },
  ({ file, gaps }) => {
    if (gaps.length === 0) return null
    return agent(
      `Write test cases for these untested paths in ${file}:\n\n` +
      gaps.map((g) => `- [${g.priority}] ${g.function}: ${g.path} — ${g.reason}`).join('\n') +
      `\n\nUse Jest-style testing (describe/it/expect). Each test should be independent and deterministic.`,
      { label: `generate:${file}`, phase: 'Generate', schema: TEST_SCHEMA }
    )
  }
)

const allTests = testsByFile.filter(Boolean).flatMap((t) => t.tests || [])
log(`Generated ${allTests.length} test cases`)

// Phase 3: Verify — check test quality
phase('Verify')

const quality = await agent(
  `Review these ${allTests.length} generated test cases for quality. ` +
  `Check for: proper assertions, edge case coverage, no flaky patterns, ` +
  `descriptive names, independent tests.\n\n` +
  allTests.map((t) => `// ${t.name} — covers: ${t.covers}\n${t.code}`).join('\n\n'),
  { label: 'verify', phase: 'Verify' }
)

// Phase 4: Critic — what paths are still missing?
phase('Critic')

const criticResult = await agent(
  `We analyzed ${files.length} files and found ${allGaps.length} gaps, then generated ${allTests.length} tests.\n` +
  `What testing gaps might STILL exist? Think about:\n` +
  `- Integration between these files\n` +
  `- Error propagation across boundaries\n` +
  `- State mutation edge cases\n` +
  `- Concurrency issues\n\n` +
  `List the top 3 areas that still need attention.`,
  { label: 'critic', phase: 'Critic' }
)

return {
  filesAnalyzed: files.length,
  gapsFound: allGaps.length,
  testsGenerated: allTests.length,
  tests: allTests,
  qualityReview: quality,
  remainingGaps: criticResult,
}
