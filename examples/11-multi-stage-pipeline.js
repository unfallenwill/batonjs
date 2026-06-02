/**
 * Example 11: Multi-Stage Pipeline
 * Level: Intermediate
 *
 * Shows a 4-stage pipeline where items flow through:
 *   Ideate → Expand → Critique → Refine
 *
 * Key takeaway: Pipeline stages compose naturally.
 * Each stage receives (prevResult, originalItem, index).
 * Use originalItem/index in later stages for labeling without
 * threading context through return values.
 */

export const meta = {
  name: 'multi-stage-pipeline',
  description: '4-stage pipeline: ideate → expand → critique → refine',
  phases: [
    { title: 'Ideate', detail: 'generate raw ideas' },
    { title: 'Expand', detail: 'flesh out each idea' },
    { title: 'Critique', detail: 'find weaknesses' },
    { title: 'Refine', detail: 'polish final output' },
  ],
}

const THEMES = ['sustainability', 'education', 'healthcare']

const final = await pipeline(
  THEMES,

  // Stage 1: Generate a raw idea
  (theme) => agent(
    `Give me one innovative startup idea related to "${theme}". One sentence only.`,
    { label: `ideate:${theme}`, phase: 'Ideate' }
  ),

  // Stage 2: Expand the idea into a pitch
  (idea, theme) => agent(
    `Expand this startup idea into a 3-sentence pitch: "${idea}"`,
    { label: `expand:${theme}`, phase: 'Expand' }
  ),

  // Stage 3: Critique the pitch
  (pitch, theme) => agent(
    `What is the single biggest weakness of this pitch? Be concise.\n\n"${pitch}"`,
    { label: `critique:${theme}`, phase: 'Critique' }
  ),

  // Stage 4: Refine — address the critique
  (critique, theme, index) => agent(
    `You had this startup pitch for "${THEMES[index]}" and received this critique: "${critique}"\n` +
    `Write an improved 2-sentence version that addresses the weakness.`,
    { label: `refine:${THEMES[index]}`, phase: 'Refine' }
  ),
)

log(`Refined ${final.filter(Boolean).length} startup ideas`)

return { themes: THEMES, refinedPitches: final }
