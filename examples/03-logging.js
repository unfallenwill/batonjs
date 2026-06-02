/**
 * Example 03: Progress Logging
 * Level: Beginner
 *
 * Demonstrates log() to emit progress messages visible to the user.
 * Use log() to narrate what the workflow is doing at each step.
 *
 * Key takeaway: log() is for user-visible progress narration.
 * It doesn't affect data flow — use it to communicate status.
 */

export const meta = {
  name: 'logging',
  description: 'Demonstrates log() for progress narration',
  phases: [{ title: 'Draft', detail: 'draft three ideas' }],
}

phase('Draft')

log('Starting idea generation...')

const idea1 = await agent('Give me one creative app idea in exactly one sentence.', { label: 'idea-1' })
log('Idea 1 done ✓')

const idea2 = await agent('Give me one creative app idea in exactly one sentence.', { label: 'idea-2' })
log('Idea 2 done ✓')

const idea3 = await agent('Give me one creative app idea in exactly one sentence.', { label: 'idea-3' })
log('Idea 3 done ✓')

log('All ideas generated!')

return [idea1, idea2, idea3]
