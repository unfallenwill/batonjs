/**
 * Example 29: Release Preparation
 * Level: Advanced
 *
 * A complete release preparation workflow:
 *   1. Changelog generation from recent commits
 *   2. Version bump validation
 *   3. Breaking change detection
 *   4. Dependency audit
 *   5. Release notes drafting
 *
 * Key takeaway: Release prep has many independent checks that
 * benefit from parallelism. Use parallel for the audit phase,
 * then synthesize everything into release notes.
 *
 * Usage: Workflow({ script, args: { version: '2.0.0', scope: 'major' } })
 */

export const meta = {
  name: 'release-prep',
  description: 'Complete release preparation: changelog, audit, and notes',
  phases: [
    { title: 'Audit', detail: 'run parallel pre-release checks' },
    { title: 'Detect', detail: 'detect breaking changes' },
    { title: 'Notes', detail: 'draft release notes' },
  ],
}

const CHANGELOG_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['feat', 'fix', 'refactor', 'perf', 'docs', 'chore', 'breaking'] },
          description: { type: 'string' },
          pr: { type: 'string' },
        },
        required: ['type', 'description'],
      },
    },
  },
  required: ['entries'],
}

const BREAKING_SCHEMA = {
  type: 'object',
  properties: {
    breakingChanges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          change: { type: 'string' },
          migration: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['area', 'change', 'migration', 'impact'],
      },
    },
    totalBreaking: { type: 'number' },
  },
  required: ['breakingChanges', 'totalBreaking'],
}

const DEP_SCHEMA = {
  type: 'object',
  properties: {
    outdated: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          package: { type: 'string' },
          current: { type: 'string' },
          latest: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['package', 'current', 'latest', 'severity'],
      },
    },
    vulnerabilities: { type: 'number' },
  },
  required: ['outdated', 'vulnerabilities'],
}

const version = args?.version || '1.0.0'
const scope = args?.scope || 'minor'

// Phase 1: Parallel audit checks
phase('Audit')

const [changelog, deps, exports] = await parallel([
  // Check 1: Generate changelog from recent changes
  () => agent(
    `Look at recent changes and generate a changelog for version ${version}.\n` +
    `Categorize entries as: feat, fix, refactor, perf, docs, chore, or breaking.\n` +
    `Focus on user-facing changes.`,
    { label: 'changelog', phase: 'Audit', schema: CHANGELOG_SCHEMA }
  ),

  // Check 2: Dependency audit
  () => agent(
    `Audit package.json and lock file for:\n` +
    `- Outdated dependencies\n` +
    `- Known vulnerabilities\n` +
    `- Unused dependencies\n` +
    `Report severity for each issue.`,
    { label: 'deps', phase: 'Audit', schema: DEP_SCHEMA }
  ),

  // Check 3: Public API check
  () => agent(
    `Verify the public API surface (exports from index.ts):\n` +
    `- Are all exports documented?\n` +
    `- Are there any accidental exports (internal helpers)?\n` +
    `- Is the API consistent with the stated version scope (${scope})?`,
    { label: 'exports', phase: 'Audit' }
  ),
])

log(`Changelog: ${changelog?.entries?.length || 0} entries`)
log(`Deps: ${deps?.outdated?.length || 0} outdated, ${deps?.vulnerabilities || 0} vulnerabilities`)

// Phase 2: Breaking change detection
phase('Detect')

const breaking = await agent(
  `Based on the changelog, detect any breaking changes that users need to know about.\n` +
  `For each breaking change, provide a migration guide.\n\n` +
  `Changelog:\n${changelog?.entries?.map((e) => `[${e.type}] ${e.description}`).join('\n') || 'No entries'}`,
  { label: 'breaking', phase: 'Detect', schema: BREAKING_SCHEMA }
)

log(`Breaking changes: ${breaking?.totalBreaking || 0}`)

// Phase 3: Draft release notes
phase('Notes')

const releaseNotes = await agent(
  `Draft release notes for version ${version} (${scope} release).\n\n` +
  `Include:\n` +
  `1. Summary (2-3 sentences)\n` +
  `2. ✨ New Features\n` +
  `3. 🐛 Bug Fixes\n` +
  `4. 💥 Breaking Changes (with migration guides)\n` +
  `5. 📦 Dependencies\n` +
  `6. 🙏 Contributors\n\n` +
  `Changelog entries:\n${changelog?.entries?.map((e) => `[${e.type}] ${e.description}`).join('\n')}\n\n` +
  `Breaking changes:\n${breaking?.breakingChanges?.map((b) => `- ${b.area}: ${b.change}\n  Migration: ${b.migration}`).join('\n') || 'None'}\n\n` +
  `Dependency status: ${deps?.outdated?.length || 0} outdated, ${deps?.vulnerabilities || 0} vulnerabilities\n` +
  `Export review: ${exports || 'Not checked'}`,
  { label: 'release-notes', phase: 'Notes' }
)

log('Release notes drafted')

return {
  version,
  scope,
  changelogEntries: changelog?.entries?.length || 0,
  breakingChanges: breaking?.totalBreaking || 0,
  depIssues: deps?.outdated?.length || 0,
  vulnerabilities: deps?.vulnerabilities || 0,
  releaseNotes,
}
