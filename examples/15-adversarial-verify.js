/**
 * Example 15: Adversarial Verification
 * Level: Intermediate
 *
 * The "adversarial verify" pattern: spawn N independent skeptics,
 * each tasked with REFUTING a claim. If a majority can't refute it,
 * the claim survives. This prevents plausible-but-wrong findings.
 *
 * Key takeaway: Don't just verify once — verify adversarially.
 * Each skeptic should be prompted to TRY to find flaws.
 * Require ≥ majority agreement before accepting a claim.
 */

export const meta = {
  name: 'adversarial-verify',
  description: 'N independent skeptics try to refute a claim',
  phases: [
    { title: 'Claim', detail: 'generate a claim' },
    { title: 'Verify', detail: 'adversarial verification' },
  ],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean', description: 'Could you refute the claim?' },
    reason: { type: 'string', description: 'Your reasoning' },
    confidence: { type: 'number', description: '0-1 confidence in your verdict' },
  },
  required: ['refuted', 'reason', 'confidence'],
}

phase('Claim')

const claim = await agent(
  'State a non-obvious claim about programming language design. One sentence.',
  { label: 'claim-generator', phase: 'Claim' }
)

log(`Claim: ${claim}`)

phase('Verify')

// Spawn 3 independent skeptics, each trying to REFUTE
const votes = await parallel([
  () => agent(
    `Try to REFUTE this claim. If you can find any flaw, set refuted=true. ` +
    `Be skeptical and critical.\n\nClaim: "${claim}"`,
    { label: 'skeptic-1', phase: 'Verify', schema: VERDICT_SCHEMA }
  ),
  () => agent(
    `Your job is to DISPROVE this claim. Look for logical errors, ` +
    `overgeneralizations, or missing nuance.\n\nClaim: "${claim}"`,
    { label: 'skeptic-2', phase: 'Verify', schema: VERDICT_SCHEMA }
  ),
  () => agent(
    `Act as a contrarian. Can you poke holes in this claim? ` +
    `Default to refuted=true if uncertain.\n\nClaim: "${claim}"`,
    { label: 'skeptic-3', phase: 'Verify', schema: VERDICT_SCHEMA }
  ),
])

const validVotes = votes.filter(Boolean)
const refutedCount = validVotes.filter((v) => v.refuted).length
const survived = refutedCount < Math.ceil(validVotes.length / 2)

log(`Verdict: ${refutedCount}/${validVotes.length} skeptics refuted — claim ${survived ? 'SURVIVED ✓' : 'REJECTED ✗'}`)

return {
  claim,
  survived,
  votes: validVotes,
  summary: survived
    ? `Claim survived adversarial verification (${validVotes.length - refutedCount}/${validVotes.length} could not refute)`
    : `Claim rejected (${refutedCount}/${validVotes.length} skeptics refuted it)`,
}
