/**
 * Example 04: Phases
 * Level: Beginner
 *
 * Demonstrates phase() to group agent calls into named phases.
 * Phases appear as progress groups in the workflow UI.
 *
 * Key takeaway: Call phase('Title') BEFORE the agent calls
 * that belong to that phase. Each phase() call starts a new group.
 * Phase titles must match entries in meta.phases.
 */

export const meta = {
  name: 'phases',
  description: 'Shows how phase() groups agent calls in the UI',
  phases: [
    { title: 'Research', detail: 'gather facts' },
    { title: 'Draft', detail: 'write the summary' },
    { title: 'Polish', detail: 'refine the output' },
  ],
}

// Phase 1: Research
phase('Research')

const facts = await agent(
  'List 3 interesting facts about the Moon. Use bullet points.',
  { label: 'researcher' }
)
log('Research complete')

// Phase 2: Draft
phase('Draft')

const draft = await agent(
  `Based on these facts, write a short paragraph about the Moon:\n\n${facts}`,
  { label: 'drafter' }
)
log('Draft complete')

// Phase 3: Polish
phase('Polish')

const polished = await agent(
  `Polish this paragraph for clarity and flow. Keep it concise:\n\n${draft}`,
  { label: 'polisher' }
)
log('Polish complete')

return polished
