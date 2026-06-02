/**
 * Example 26: Multi-Vector Security Audit
 * Level: Advanced
 *
 * Performs a comprehensive security audit using multiple attack
 * vectors in parallel: injection, auth, crypto, data exposure,
 * and dependency risks. Each finding is adversarially verified
 * by security-focused skeptics.
 *
 * Key takeaway: Security audits need multiple lenses (OWASP Top 10,
 * CWE, etc.) because one perspective misses entire vulnerability
 * classes. Adversarial verification is critical — false positives
 * waste time and erode trust.
 *
 * Usage: Workflow({ script, args: { target: 'src/', severity: 'high' } })
 */

export const meta = {
  name: 'security-audit',
  description: 'Multi-vector security audit with adversarial verification',
  phases: [
    { title: 'Scan', detail: 'scan for vulnerabilities' },
    { title: 'Verify', detail: 'adversarial verification' },
    { title: 'Report', detail: 'security report' },
  ],
}

const VULN_SCHEMA = {
  type: 'object',
  properties: {
    vulnerabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          cwe: { type: 'string', description: 'CWE ID if applicable' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          location: { type: 'string' },
          description: { type: 'string' },
          exploit_scenario: { type: 'string' },
          remediation: { type: 'string' },
        },
        required: ['title', 'severity', 'location', 'description', 'exploit_scenario', 'remediation'],
      },
    },
  },
  required: ['vulnerabilities'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean' },
    adjusted_severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'informational'] },
    reason: { type: 'string' },
  },
  required: ['confirmed', 'adjusted_severity', 'reason'],
}

const target = args?.target || 'src/'
const minSeverity = args?.severity || 'medium'

const VECTORS = [
  { key: 'injection', name: 'Injection Attacks', prompt: 'SQL injection, command injection, XSS, LDAP injection, path traversal' },
  { key: 'auth', name: 'Authentication & Authorization', prompt: 'Broken auth, privilege escalation, session management, token handling' },
  { key: 'crypto', name: 'Cryptography', prompt: 'Weak algorithms, hardcoded keys, insecure randomness, missing encryption' },
  { key: 'data', name: 'Data Exposure', prompt: 'Sensitive data exposure, information leakage, improper error messages, logging secrets' },
  { key: 'config', name: 'Configuration', prompt: 'Insecure defaults, missing security headers, CORS misconfiguration, debug mode' },
]

// Phase 1: Scan — parallel multi-vector sweep
phase('Scan')

const scans = await parallel(
  VECTORS.map((v) => () =>
    agent(
      `Perform a security audit of ${target} focusing on: ${v.name}.\n` +
      `Look for: ${v.prompt}\n` +
      `Only report ${minSeverity} severity and above. Each finding must include a realistic exploit scenario.`,
      { label: `scan:${v.key}`, phase: 'Scan', schema: VULN_SCHEMA }
    )
  )
)

const allVulns = scans.filter(Boolean).flatMap((s) => s.vulnerabilities)
log(`Scan complete: ${allVulns.length} potential vulnerabilities across ${VECTORS.length} vectors`)

// Dedup by title+location
const seen = new Set()
const unique = allVulns.filter((v) => {
  const key = `${v.title}:${v.location}`.slice(0, 60)
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
log(`After dedup: ${unique.length} unique vulnerabilities`)

// Phase 2: Verify — 2 adversarial security skeptics per vulnerability
phase('Verify')

const verified = await parallel(
  unique.map((vuln) => () =>
    parallel([
      () => agent(
        `You are a security expert. Challenge this vulnerability claim:\n` +
        `Title: ${vuln.title}\nLocation: ${vuln.location}\n` +
        `Exploit: ${vuln.exploit_scenario}\n` +
        `Is this a REAL exploitable vulnerability, or a false positive?`,
        { label: `sec-verify:1:${vuln.title.slice(0, 15)}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ),
      () => agent(
        `Pentester review: Can this vulnerability actually be exploited in practice?\n` +
        `Title: ${vuln.title}\nExploit scenario: ${vuln.exploit_scenario}\n` +
        `Be critical. Is the exploit realistic?`,
        { label: `sec-verify:2:${vuln.title.slice(0, 15)}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ),
    ]).then((votes) => {
      const confirmed = votes.filter(Boolean).filter((v) => v.confirmed)
      return {
        ...vuln,
        confirmed: confirmed.length >= 1,
        adjustedSeverity: confirmed[0]?.adjusted_severity || vuln.severity,
      }
    })
  )
)

const confirmedVulns = verified.filter((v) => v?.confirmed)
const critical = confirmedVulns.filter((v) => v.adjustedSeverity === 'critical')

log(`Verified: ${confirmedVulns.length}/${unique.length} confirmed (${critical.length} critical)`)

// Phase 3: Report
phase('Report')

const report = await agent(
  `Generate a professional security audit report.\n\n` +
  `Confirmed vulnerabilities: ${confirmedVulns.length}\n` +
  `Critical: ${critical.length}\n\n` +
  confirmedVulns.map((v, i) =>
    `${i + 1}. [${v.adjustedSeverity.toUpperCase()}] ${v.title}\n` +
    `   Location: ${v.location}\n` +
    `   CWE: ${v.cwe || 'N/A'}\n` +
    `   Exploit: ${v.exploit_scenario}\n` +
    `   Fix: ${v.remediation}`
  ).join('\n\n'),
  { label: 'sec-report', phase: 'Report' }
)

return {
  vectorsScanned: VECTORS.length,
  potentialVulns: allVulns.length,
  confirmedVulns: confirmedVulns.length,
  critical: critical.length,
  report,
}
