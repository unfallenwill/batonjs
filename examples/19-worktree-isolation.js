/**
 * Example 19: Worktree Isolation
 * Level: Intermediate
 *
 * Demonstrates the `isolation: 'worktree'` option for parallel
 * file mutations. Each agent gets its own git worktree so they
 * can modify files without conflicting with each other.
 *
 * Key takeaway: Use isolation: 'worktree' ONLY when agents
 * mutate files in parallel and would otherwise conflict.
 * Worktrees have overhead (~200-500ms setup + disk per agent).
 * Don't use them for read-only agents.
 */

export const meta = {
  name: 'worktree-isolation',
  description: 'Parallel file mutations with git worktree isolation',
  phases: [
    { title: 'Mutate', detail: 'parallel file edits in worktrees' },
    { title: 'Review', detail: 'review the changes' },
  ],
}

const FILES = [
  'README.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
]

phase('Mutate')

// Each agent modifies a different file in its own worktree.
// No conflicts because each has an isolated copy of the repo.
const results = await parallel(
  FILES.map((file) => () => agent(
    `Read the file ${file} and suggest improvements. ` +
    `Fix any typos, improve clarity, and add any missing sections. ` +
    `Apply the changes directly to the file.`,
    { label: `fix:${file}`, phase: 'Mutate', isolation: 'worktree' }
  ))
)

log(`Processed ${results.filter(Boolean).length}/${FILES.length} files`)

phase('Review')

const review = await agent(
  `Review the improvements made to these files: ${FILES.join(', ')}. ` +
  `Summarize the key changes that were made.`,
  { label: 'review', phase: 'Review' }
)

return { files: FILES, results: results.filter(Boolean), review }
