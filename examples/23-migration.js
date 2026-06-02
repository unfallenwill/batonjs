/**
 * Example 23: Large-Scale Code Migration
 * Level: Advanced
 *
 * Migrates code patterns across many files using pipeline with
 * worktree isolation. Each file gets its own worktree for safe
 * parallel mutation.
 *
 * Key takeaway: For large-scale refactors, use pipeline with
 * isolation: 'worktree' so each agent can safely modify files
 * without conflicts. Transform → verify → move to next file.
 *
 * Usage: Workflow({ script, args: { files: [...], from: 'xyz', to: 'abc' } })
 */

export const meta = {
  name: 'migration',
  description: 'Large-scale pattern migration across files with worktree isolation',
  phases: [
    { title: 'Assess', detail: 'assess each file' },
    { title: 'Migrate', detail: 'apply migration' },
    { title: 'Verify', detail: 'verify migration' },
    { title: 'Report', detail: 'migration report' },
  ],
}

const ASSESS_SCHEMA = {
  type: 'object',
  properties: {
    needsMigration: { type: 'boolean' },
    occurrenceCount: { type: 'number' },
    lines: { type: 'array', items: { type: 'number' } },
    complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
  },
  required: ['needsMigration', 'occurrenceCount', 'lines', 'complexity'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    remainingOccurrences: { type: 'number' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['success', 'remainingOccurrences', 'issues'],
}

const files = args?.files || ['src/utils.ts', 'src/helpers.ts', 'src/main.ts']
const fromPattern = args?.from || 'console.log'
const toPattern = args?.to || 'logger.info'

// Pipeline: each file goes through assess → migrate → verify
const results = await pipeline(
  files,

  // Stage 1: Assess
  (file) => agent(
    `Read ${file} and assess how many occurrences of "${fromPattern}" exist. ` +
    `Report the count, line numbers, and migration complexity.`,
    { label: `assess:${file}`, phase: 'Assess', schema: ASSESS_SCHEMA }
  ),

  // Stage 2: Migrate (with worktree isolation)
  (assessment, file) => {
    if (!assessment || !assessment.needsMigration) {
      log(`${file}: no migration needed, skipping`)
      return { file, skipped: true, assessment }
    }
    return agent(
      `In ${file}, replace all occurrences of "${fromPattern}" with "${toPattern}". ` +
      `Make sure to update imports if needed. Preserve formatting and logic.\n` +
      `There are ${assessment.occurrenceCount} occurrences to migrate.`,
      { label: `migrate:${file}`, phase: 'Migrate', isolation: 'worktree' }
    ).then((result) => ({ file, skipped: false, assessment, migration: result }))
  },

  // Stage 3: Verify
  (result, file) => {
    if (result?.skipped) return result
    return agent(
      `Verify that the migration of "${fromPattern}" → "${toPattern}" was applied ` +
      `correctly in ${file}. Check that no "${fromPattern}" remains and the code ` +
      `still makes logical sense.`,
      { label: `verify:${file}`, phase: 'Verify', schema: VERIFY_SCHEMA }
    ).then((verification) => ({ ...result, verification }))
  }
)

phase('Report')

const summary = {
  total: files.length,
  skipped: results.filter((r) => r?.skipped).length,
  migrated: results.filter((r) => !r?.skipped).length,
  verified: results.filter((r) => r?.verification?.success).length,
  issues: results.filter((r) => r?.verification?.issues?.length > 0).flatMap((r) => r.verification.issues),
}

log(`Migration: ${summary.migrated} files migrated, ${summary.verified} verified, ${summary.issues.length} issues`)

return summary
