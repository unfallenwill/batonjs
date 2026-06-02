/**
 * Example 28: Refactor at Scale
 * Level: Advanced
 *
 * Refactors a codebase pattern across many files using a multi-phase
 * approach: discover → plan → execute (with worktrees) → verify.
 * Includes rollback safety by verifying each change.
 *
 * Key takeaway: Large refactors need a discovery phase first.
 * Don't jump straight to editing — understand the scope,
 * create a plan, then execute with verification at each step.
 *
 * Usage: Workflow({ script, args: { pattern: 'callback → async/await', dir: 'src/' } })
 */

export const meta = {
  name: 'refactor-at-scale',
  description: 'Discover-plan-execute-verify refactor pipeline at scale',
  phases: [
    { title: 'Discover', detail: 'find all occurrences' },
    { title: 'Plan', detail: 'create refactor plan' },
    { title: 'Execute', detail: 'apply refactoring' },
    { title: 'Verify', detail: 'verify each change' },
  ],
}

const DISCOVER_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          occurrences: { type: 'number' },
          complexity: { type: 'string', enum: ['trivial', 'moderate', 'complex'] },
          dependencies: { type: 'array', items: { type: 'string' }, description: 'Other files affected' },
        },
        required: ['path', 'occurrences', 'complexity', 'dependencies'],
      },
    },
    totalOccurrences: { type: 'number' },
  },
  required: ['files', 'totalOccurrences'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    remainingOccurrences: { type: 'number' },
  },
  required: ['passed', 'issues', 'remainingOccurrences'],
}

const pattern = args?.pattern || 'callback functions to async/await'
const dir = args?.dir || 'src/'

// Phase 1: Discover the scope
phase('Discover')

const scope = await agent(
  `Search ${dir} for code that uses the pattern: "${pattern}". ` +
  `For each file, count occurrences and assess complexity. ` +
  `Also identify cross-file dependencies (files that import from affected files).`,
  { label: 'discover', phase: 'Discover', schema: DISCOVER_SCHEMA }
)

log(`Discovered ${scope.totalOccurrences} occurrences across ${scope.files.length} files`)

// Phase 2: Create a refactor plan
phase('Plan')

const plan = await agent(
  `Create a detailed refactor plan for converting "${pattern}" across these files.\n` +
  `Order files by dependency (leaf files first).\n` +
  `For each file, describe the specific transformations needed.\n\n` +
  `Files:\n${scope.files.map((f) => `- ${f.path} (${f.occurrences} occurrences, ${f.complexity})`).join('\n')}`,
  { label: 'plan', phase: 'Plan' }
)

log('Refactor plan created')

// Phase 3: Execute — refactor each file with worktree isolation
phase('Execute')

const orderedFiles = scope.files
  .sort((a, b) => {
    const order = { trivial: 0, moderate: 1, complex: 2 }
    return (order[a.complexity] || 0) - (order[b.complexity] || 0)
  })

const executed = await pipeline(
  orderedFiles,
  (file) => agent(
    `Refactor ${file.path}: convert "${pattern}".\n` +
    `There are ${file.occurrences} occurrences. This is a ${file.complexity} refactor.\n` +
    `Apply all changes. Preserve behavior — only change the pattern, not the logic.`,
    { label: `refactor:${file.path}`, phase: 'Execute', isolation: 'worktree' }
  ),
  // Stage 2: Verify immediately after execution
  (result, file) => agent(
    `Verify the refactoring in ${file.path} was applied correctly.\n` +
    `Check:\n` +
    `1. No remaining old pattern occurrences\n` +
    `2. New code is syntactically correct\n` +
    `3. Behavior is preserved\n` +
    `4. Types still check out`,
    { label: `verify:${file.path}`, phase: 'Verify', schema: VERIFY_SCHEMA }
  )
)

const passed = executed.filter((r) => r?.passed).length
const failed = executed.filter((r) => r && !r.passed).length
log(`Verification: ${passed} passed, ${failed} failed`)

return {
  pattern,
  totalOccurrences: scope.totalOccurrences,
  filesAffected: scope.files.length,
  passed,
  failed,
  details: executed,
}
