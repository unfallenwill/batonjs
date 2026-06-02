/**
 * Example 31: README Generator
 * Level: Advanced
 *
 * Generates a high-quality README for the current project by researching
 * the codebase from five perspectives (the five core responsibilities
 * of a README):
 *
 *   1. 30-Second Decision — What is it? Why should I care?
 *   2. Quick Start        — Install → Minimal example → See result
 *   3. Navigation          — Links to deeper docs (API, config, architecture)
 *   4. Trust Signals       — Maintenance status, badges, license, contributors
 *   5. Discoverability     — Keywords, description for GitHub/npm search
 *
 * Key takeaway: A README serves multiple audiences simultaneously. Use
 * parallel agents to research each dimension independently, then a
 * synthesis agent to weave them into one cohesive document.
 *
 * Usage: Workflow({ script })   — no args needed, reads the current project
 */

export const meta = {
  name: 'readme-gen',
  description: 'Five-dimension README generator for the current project',
  phases: [
    { title: 'Research', detail: 'parallel research across five README dimensions' },
    { title: 'Draft', detail: 'draft each section from research findings' },
    { title: 'Synthesize', detail: 'assemble into a cohesive README' },
  ],
}

// No args needed — agents read package.json, source files, and project
// structure directly from the current working directory.

// ---------- Schemas ----------

const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    oneLiner: { type: 'string', description: 'One-sentence description of the project' },
    problemSolved: { type: 'string', description: 'What problem does it solve?' },
    keyDifferentiator: { type: 'string', description: 'Why choose this over alternatives?' },
    targetAudience: { type: 'string', description: 'Who is this for?' },
    elevatorPitch: { type: 'string', description: '2-3 sentence pitch paragraph' },
  },
  required: ['oneLiner', 'problemSolved', 'keyDifferentiator', 'targetAudience', 'elevatorPitch'],
}

const QUICKSTART_SCHEMA = {
  type: 'object',
  properties: {
    prerequisites: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of prerequisites (Node version, etc.)',
    },
    installCommand: { type: 'string' },
    installNotes: { type: 'string' },
    minimalExample: { type: 'string', description: 'Complete minimal code example in a fenced code block' },
    expectedOutput: { type: 'string', description: 'What the user should see after running the example' },
    nextSteps: { type: 'string', description: 'Where to go after the quick start' },
  },
  required: ['prerequisites', 'installCommand', 'minimalExample', 'expectedOutput', 'nextSteps'],
}

const NAVIGATION_SCHEMA = {
  type: 'object',
  properties: {
    topLevelSections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          linkTarget: { type: 'string', description: 'File or URL the section links to' },
        },
        required: ['title', 'description', 'linkTarget'],
      },
    },
    apiSurface: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          kind: { type: 'string', enum: ['function', 'class', 'type', 'constant'] },
          oneLineSummary: { type: 'string' },
        },
        required: ['name', 'kind', 'oneLineSummary'],
      },
    },
  },
  required: ['topLevelSections', 'apiSurface'],
}

const TRUST_SCHEMA = {
  type: 'object',
  properties: {
    license: { type: 'string' },
    licenseFile: { type: 'string' },
    maintenanceStatus: { type: 'string', enum: ['active', 'stable', 'maintenance', 'archived'] },
    ciBadge: { type: 'string', description: 'CI badge markdown if CI is configured' },
    packageManager: { type: 'string', description: 'npm, yarn, pnpm, etc.' },
    suggestedBadges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          markdown: { type: 'string' },
        },
        required: ['label', 'markdown'],
      },
    },
  },
  required: ['license', 'maintenanceStatus', 'packageManager', 'suggestedBadges'],
}

const DISCOVER_SCHEMA = {
  type: 'object',
  properties: {
    npmKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords for package.json and npm discoverability',
    },
    githubTopics: {
      type: 'array',
      items: { type: 'string' },
      description: 'GitHub repository topics',
    },
    metaDescription: { type: 'string', description: '150-char description for SEO / GitHub preview' },
    searchAliases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Alternative names users might search for',
    },
  },
  required: ['npmKeywords', 'githubTopics', 'metaDescription'],
}

// ---------- Phase 1: Research ----------

phase('Research')

// A shared preamble every research agent gets — tells them to discover
// everything from the current project on disk, no manual hints needed.
const RESEARCH_CONTEXT =
  `You are researching the project in the current working directory. ` +
  `Read package.json to get the project name, version, description, and entry points. ` +
  `Explore the source tree (src/, lib/, or whatever exists) to understand what this project does. ` +
  `Check any existing README.md, CHANGELOG.md, docs/ folder, and configuration files.\n\n`

const [decision, quickstart, navigation, trust, discover] = await parallel([

  // Dimension 1: 30-Second Decision
  () => agent(
    `${RESEARCH_CONTEXT}` +
    `Answer these questions about the project:\n` +
    `- What is this project in one sentence?\n` +
    `- What problem does it solve?\n` +
    `- What makes it different from alternatives?\n` +
    `- Who is the target audience?\n\n` +
    `Write a compelling 2-3 sentence elevator pitch. Be specific, not generic.`,
    { label: 'research:decision', phase: 'Research', schema: DECISION_SCHEMA },
  ),

  // Dimension 2: Quick Start
  () => agent(
    `${RESEARCH_CONTEXT}` +
    `Determine the fastest path from zero to running code:\n` +
    `1. Prerequisites (Node version, etc.)\n` +
    `2. Exact install command\n` +
    `3. The simplest possible working code example — a "hello world" that shows the core value prop.\n` +
    `   Include the full code in a fenced block with the correct language tag.\n` +
    `4. What output or result the user should see\n` +
    `5. Where to go next after this works\n\n` +
    `The example must be COPY-PASTE-RUNNABLE. No placeholders, no TODOs.`,
    { label: 'research:quickstart', phase: 'Research', schema: QUICKSTART_SCHEMA },
  ),

  // Dimension 3: Navigation
  () => agent(
    `${RESEARCH_CONTEXT}` +
    `Map out the project structure:\n` +
    `1. List all top-level sections the README should link to (API docs, config guide, ` +
    `   architecture, examples, contributing, changelog, etc.). For each, note what file ` +
    `   or URL it should point to.\n` +
    `2. List the public API surface — exported functions, classes, types, constants — ` +
    `   with a one-line summary of each.\n\n` +
    `Be comprehensive. Check exports from index files, public type definitions, etc.`,
    { label: 'research:navigation', phase: 'Research', schema: NAVIGATION_SCHEMA },
  ),

  // Dimension 4: Trust Signals
  () => agent(
    `${RESEARCH_CONTEXT}` +
    `Analyze the project for trust signals:\n` +
    `1. What license? Check LICENSE file and package.json "license" field.\n` +
    `2. Is CI configured? Look for .github/workflows/, .travis.yml, etc.\n` +
    `3. What package manager? Check lock files (package-lock.json, yarn.lock, pnpm-lock.yaml).\n` +
    `4. Suggest appropriate badges (CI status, npm version, license, bundle size, coverage, etc.)\n` +
    `5. Assess maintenance status based on recent commit activity and project configuration.\n\n` +
    `Return concrete badge markdown snippets, not just descriptions.`,
    { label: 'research:trust', phase: 'Research', schema: TRUST_SCHEMA },
  ),

  // Dimension 5: Discoverability
  () => agent(
    `${RESEARCH_CONTEXT}` +
    `Analyze the project for discoverability:\n` +
    `1. What keywords should be in package.json "keywords"? Think about what users actually search for.\n` +
    `2. What GitHub topics should be set?\n` +
    `3. Write a 150-char meta description that would appear in Google/GitHub search results.\n` +
    `4. What alternative names might users search for when looking for this tool?\n\n` +
    `Focus on search terms real developers would use, not marketing buzzwords.`,
    { label: 'research:discover', phase: 'Research', schema: DISCOVER_SCHEMA },
  ),
])

log(`Research complete: decision=${!!decision} quickstart=${!!quickstart} navigation=${!!navigation} trust=${!!trust} discover=${!!discover}`)

// ---------- Phase 2: Draft Sections ----------

phase('Draft')

// Resolve project name from research — fallback to "this project" if missing.
const project = decision?.oneLiner
  ? decision.oneLiner.split(' ').slice(0, 2).join(' ')
  : 'this project'

const SECTION_SCHEMA = {
  type: 'object',
  properties: {
    heading: { type: 'string' },
    markdown: { type: 'string', description: 'The full section content in Markdown' },
    wordCount: { type: 'number' },
  },
  required: ['heading', 'markdown', 'wordCount'],
}

const sections = await parallel([

  // Section 1: Header + Pitch (Decision)
  () => agent(
    `Write the TOP of the README for "${project}". This must include:\n\n` +
    `1. Project title as h1 (use the real project name from package.json)\n` +
    `2. Badges (use these):\n${trust?.suggestedBadges?.map((b) => `   ${b.markdown}`).join('\n') || '   (none suggested)'}\n` +
    `3. A one-line description below the badges\n` +
    `4. The elevator pitch as the opening paragraph\n\n` +
    `Elevator pitch: ${decision?.elevatorPitch || 'N/A'}\n` +
    `One-liner: ${decision?.oneLiner || 'N/A'}\n\n` +
    `The first screenful must hook the reader. Be concrete and specific — no fluff.`,
    { label: 'draft:header', phase: 'Draft', schema: SECTION_SCHEMA },
  ),

  // Section 2: Quick Start
  () => agent(
    `Write the "Quick Start" section for "${project}". Use this research:\n\n` +
    `Prerequisites: ${quickstart?.prerequisites?.join(', ') || 'None'}\n` +
    `Install: \`${quickstart?.installCommand || 'npm install ...'}\`\n` +
    `${quickstart?.installNotes ? 'Notes: ' + quickstart.installNotes + '\n' : ''}` +
    `Minimal example:\n${quickstart?.minimalExample || '// TODO'}\n\n` +
    `Expected result: ${quickstart?.expectedOutput || 'N/A'}\n` +
    `Next steps: ${quickstart?.nextSteps || 'See API docs'}\n\n` +
    `The code example MUST be complete and runnable. Use fenced code blocks with the correct ` +
    `language tag. Keep prose minimal — let the code speak.`,
    { label: 'draft:quickstart', phase: 'Draft', schema: SECTION_SCHEMA },
  ),

  // Section 3: Features / Why This?
  () => agent(
    `Write the "Features" / "Why ${project}?" section based on this research:\n\n` +
    `Problem solved: ${decision?.problemSolved || 'N/A'}\n` +
    `Key differentiator: ${decision?.keyDifferentiator || 'N/A'}\n` +
    `Target audience: ${decision?.targetAudience || 'N/A'}\n\n` +
    `Format as a bullet list of 4-8 concrete features with brief explanations. ` +
    `Each feature should be something the user can verify, not a vague claim. ` +
    `Use ✅ or similar indicators where appropriate.`,
    { label: 'draft:features', phase: 'Draft', schema: SECTION_SCHEMA },
  ),

  // Section 4: API Overview
  () => agent(
    `Write the "API" overview section for "${project}". Public API surface:\n\n` +
    `${navigation?.apiSurface?.map((a) => `- \`${a.name}\` (${a.kind}): ${a.oneLineSummary}`).join('\n') || 'No API surface found'}\n\n` +
    `For each export, write a one-line description with a tiny usage snippet (1-2 lines). ` +
    `Group related items together. Link to detailed docs if navigation suggests them:\n` +
    `${navigation?.topLevelSections?.map((s) => `- [${s.title}](${s.linkTarget})`).join('\n') || 'No deep docs found'}\n\n` +
    `Keep this section scannable — it's a reference, not a tutorial.`,
    { label: 'draft:api', phase: 'Draft', schema: SECTION_SCHEMA },
  ),

  // Section 5: Links & Navigation
  () => agent(
    `Write the "Documentation" / "Resources" navigation section for "${project}".\n\n` +
    `Available deep-dive resources:\n${navigation?.topLevelSections?.map((s) => `- ${s.title}: ${s.description} → ${s.linkTarget}`).join('\n') || 'None found'}\n\n` +
    `Format as a clean link list with one-line descriptions. Group by category ` +
    `(Guides, API Reference, Community, etc.).`,
    { label: 'draft:links', phase: 'Draft', schema: SECTION_SCHEMA },
  ),

  // Section 6: Contributing + License (Trust)
  () => agent(
    `Write the bottom sections for "${project}" README:\n\n` +
    `1. "Contributing" — brief section pointing to contributing guide if it exists. ` +
    `   Mention how to report bugs, request features, and submit PRs.\n` +
    `2. "License" — single line: "This project is licensed under the [${trust?.license || 'MIT'}](${trust?.licenseFile || 'LICENSE'}) license."\n\n` +
    `Maintenance status: ${trust?.maintenanceStatus || 'active'}\n` +
    `Package manager: ${trust?.packageManager || 'npm'}\n\n` +
    `Keep it concise. These sections are functional, not promotional.`,
    { label: 'draft:contributing', phase: 'Draft', schema: SECTION_SCHEMA },
  ),
])

const writtenSections = sections.filter(Boolean)
log(`Drafted ${writtenSections.length}/6 sections (${writtenSections.reduce((sum, s) => sum + (s?.wordCount || 0), 0)} words total)`)

// ---------- Phase 3: Synthesize ----------

phase('Synthesize')

const assembledSections = writtenSections
  .map((s) => `### ${s.heading}\n\n${s.markdown}`)
  .join('\n\n---\n\n')

const readme = await agent(
  `Assemble a complete README.md for "${project}" from these drafted sections.\n\n` +
  `RULES:\n` +
  `- Keep all factual content from the sections — do NOT drop information\n` +
  `- Ensure consistent tone: professional, concise, no hype\n` +
  `- Fix heading levels: project title is h1 (#), major sections are h2 (##), subsections are h3 (###)\n` +
  `- Add horizontal rules (---) between major sections for readability\n` +
  `- Ensure the first screenful (before scroll) contains: title, badges, one-liner, and the opening pitch\n` +
  `- Add a brief table of contents after the pitch if there are 4+ sections\n` +
  `- Cross-reference sections where relevant ("See the Quick Start above", "Full API reference → docs/api.md")\n` +
  `- Remove any redundant paragraphs between sections\n` +
  `- Ensure all code blocks have correct language tags\n` +
  `- The final output must be VALID Markdown — no HTML unless for badges\n\n` +
  `SEO meta (place as HTML comment at the very top):\n` +
  `<!-- ${discover?.metaDescription || project + ' - a developer tool'} -->\n\n` +
  `Sections to assemble:\n\n${assembledSections}`,
  { label: 'synthesize', phase: 'Synthesize' },
)

log('README synthesized')

return {
  project,
  sectionsDrafted: writtenSections.length,
  research: {
    decision: !!decision,
    quickstart: !!quickstart,
    navigation: !!navigation,
    trust: !!trust,
    discover: !!discover,
  },
  suggestedKeywords: discover?.npmKeywords || [],
  suggestedTopics: discover?.githubTopics || [],
  readme,
}
