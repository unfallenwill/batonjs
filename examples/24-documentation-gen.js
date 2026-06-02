/**
 * Example 24: Multi-Section Documentation Generator
 * Level: Advanced
 *
 * Generates documentation by splitting work across sections,
 * each written by a specialized agent. Uses parallel to write
 * all sections concurrently, then assembles them.
 *
 * Key takeaway: Documentation has natural parallelism — each
 * section is independent. Use parallel to write all sections
 * simultaneously, then a final agent to ensure consistency.
 *
 * Usage: Workflow({ script, args: { project: 'My Library', sections: [...] } })
 */

export const meta = {
  name: 'documentation-gen',
  description: 'Parallel documentation generation with section assembly',
  phases: [
    { title: 'Outline', detail: 'create documentation outline' },
    { title: 'Write', detail: 'write each section' },
    { title: 'Assemble', detail: 'assemble and unify' },
  ],
}

const project = args?.project || 'BatonJS'
const sourceDir = args?.sourceDir || 'src/'

const OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', description: 'What this section covers' },
          subsections: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'description', 'subsections'],
      },
    },
  },
  required: ['sections'],
}

// Phase 1: Create outline
phase('Outline')

const outline = await agent(
  `Create a comprehensive documentation outline for the project "${project}" ` +
  `at ${sourceDir}. Include these sections: Getting Started, API Reference, ` +
  `Architecture, Configuration, Examples, Contributing.`,
  { label: 'outline', phase: 'Outline', schema: OUTLINE_SCHEMA }
)

log(`Outline: ${outline.sections.length} sections planned`)

// Phase 2: Write all sections in parallel
phase('Write')

const sections = await parallel(
  outline.sections.map((section) => () =>
    agent(
      `Write the "${section.title}" section for the "${project}" documentation.\n` +
      `This section should cover: ${section.description}\n` +
      `Subsections to include: ${section.subsections.join(', ')}\n\n` +
      `Write in clear, professional Markdown. Include code examples where appropriate. ` +
      `The section should be 200-400 words.`,
      { label: `write:${section.title}`, phase: 'Write' }
    )
  )
)

const writtenSections = sections.filter(Boolean)
log(`Written ${writtenSections.length}/${outline.sections.length} sections`)

// Phase 3: Assemble and unify
phase('Assemble')

const toc = outline.sections.map((s, i) => `${i + 1}. ${s.title}`).join('\n')

const finalDoc = await agent(
  `Assemble these documentation sections into a single cohesive document for "${project}".\n\n` +
  `Table of Contents:\n${toc}\n\n` +
  `Requirements:\n` +
  `- Ensure consistent tone and terminology across sections\n` +
  `- Add cross-references between sections where relevant\n` +
  `- Add a brief intro paragraph at the top\n` +
  `- Fix any contradictions between sections\n\n` +
  `Sections:\n\n${writtenSections.join('\n\n---\n\n')}`,
  { label: 'assemble', phase: 'Assemble' }
)

log('Documentation assembled')

return { sections: outline.sections.length, totalWords: finalDoc.split(/\s+/).length, document: finalDoc }
