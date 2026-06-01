export const meta = {
  name: 'fix-agent-context-types',
  description:
    'Find an elegant alternative to structural types in AgentContext to break the circular dependency',
  phases: [
    { title: 'analyze', detail: 'Map the exact circular dependency chain' },
    { title: 'brainstorm', detail: 'Research approaches to break the cycle' },
    { title: 'evaluate', detail: 'Score each approach against project constraints' },
    { title: 'recommend', detail: 'Produce implementation plan for the best approach' },
  ],
}

const analysisSchema = {
  type: 'object',
  properties: {
    cycleChain: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          importType: { type: 'string', enum: ['value', 'type-only'] },
          importedSymbols: { type: 'array', items: { type: 'string' } },
        },
        required: ['from', 'to', 'importType', 'importedSymbols'],
      },
    },
    isPurelyTypeLevel: { type: 'boolean' },
    agentContextWithConcreteTypes: { type: 'string' },
    agentContextWithStructuralTypes: { type: 'string' },
    depCruiserConfig: { type: 'string' },
  },
  required: [
    'cycleChain',
    'isPurelyTypeLevel',
    'agentContextWithConcreteTypes',
    'agentContextWithStructuralTypes',
    'depCruiserConfig',
  ],
}

const approachSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    howItBreaksCycle: { type: 'string' },
    filesToChange: { type: 'array', items: { type: 'string' } },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    publicApiImpact: { type: 'string' },
    elegance: { type: 'number', minimum: 1, maximum: 10 },
  },
  required: [
    'name',
    'description',
    'howItBreaksCycle',
    'filesToChange',
    'pros',
    'cons',
    'publicApiImpact',
    'elegance',
  ],
}

const approachesSchema = {
  type: 'object',
  properties: {
    approaches: { type: 'array', items: approachSchema },
  },
  required: ['approaches'],
}

const recommendationSchema = {
  type: 'object',
  properties: {
    approachName: { type: 'string' },
    reasoning: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        simplicity: { type: 'number' },
        typeSafety: { type: 'number' },
        conventionality: { type: 'number' },
        maintainability: { type: 'number' },
        robustness: { type: 'number' },
      },
      required: [
        'simplicity',
        'typeSafety',
        'conventionality',
        'maintainability',
        'robustness',
      ],
    },
  },
  required: ['approachName', 'reasoning', 'scores'],
}

const planSchema = {
  type: 'object',
  properties: {
    filesToCreate: { type: 'array', items: { type: 'string' } },
    filesToModify: { type: 'array', items: { type: 'string' } },
    filesToDelete: { type: 'array', items: { type: 'string' } },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          change: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['file', 'change'],
      },
    },
  },
  required: ['filesToCreate', 'filesToModify', 'filesToDelete', 'steps'],
}

// ── Phase 1: Analyze ──────────────────────────────────────────────────

phase('analyze')

const analysis = await agent(
  [
    'Analyze the circular dependency problem in the AgentFlow project at /home/caosen/GitHub/agentflow.',
    '',
    'The current state:',
    '- src/types.ts defines AgentContext using STRUCTURAL types (e.g. { acquire(): Promise<() => void> }) instead of referencing the concrete Semaphore, BudgetTracker, EngineEventBus classes.',
    '- This was done to break a cycle: types.ts -> core/events.ts -> types.ts (because events.ts imports EngineEvent type from types.ts).',
    '',
    'Your task:',
    '1. Read ALL source files in src/ and map the EXACT dependency graph (both value imports and type-only imports)',
    '2. Identify every edge in the cycle chain precisely',
    '3. Classify each edge as "value import" or "type-only import"',
    '4. Read the .dependency-cruiser.cjs config to understand how it detects cycles (check tsPreCompilationDeps setting)',
    '5. Read the current AgentContext definition in types.ts and list what it would look like with concrete class names',
    '',
    'Return a structured analysis with:',
    '- The exact cycle chain with each edge labeled as value or type-only',
    '- What AgentContext would look like with concrete types',
    '- Whether the cycle involves ANY value imports or is purely type-level',
  ].join('\n'),
  { schema: analysisSchema },
)

log(
  'Cycle analysis: ' +
    (analysis.isPurelyTypeLevel ? 'PURELY TYPE-LEVEL' : 'INVOLVES VALUE IMPORTS'),
)

// ── Phase 2: Brainstorm ───────────────────────────────────────────────

phase('brainstorm')

const approaches = await agent(
  [
    'You are a TypeScript architect. Given the following circular dependency analysis, brainstorm ALL possible approaches to eliminate structural types in AgentContext while avoiding runtime circular dependencies.',
    '',
    'Current problem:',
    '- AgentContext in types.ts uses structural types instead of Semaphore, BudgetTracker, EngineEventBus',
    '- The cycle is: ' + JSON.stringify(analysis.cycleChain),
    '- Is purely type-level: ' + String(analysis.isPurelyTypeLevel),
    '',
    'Project constraints (from CLAUDE.md):',
    '- Zero any, zero non-null assertions',
    '- verbatimModuleSyntax: true (type imports must use import type)',
    '- Discriminated unions over optional property stacking',
    '- Result pattern for error handling',
    '- dependency-cruiser enforces no-circular with tsPreCompilationDeps: true',
    '',
    'Consider these approaches and any others you can think of:',
    '',
    '1. Type-only cycle tolerance: Configure dependency-cruiser to ignore type-only cycles (since import type is erased at compile time).',
    '2. Interface extraction: Create src/interfaces.ts with thin interfaces that both types.ts and core/ can reference.',
    '3. Dependency inversion: Invert the dependency so core/ modules register themselves with types.ts.',
    '4. Layer split: Split types.ts into multiple files by dependency layer.',
    '5. Forward declaration: Use a separate .d.ts file or declaration merging.',
    '',
    'For each approach, provide: name, description, howItBreaksCycle, filesToChange, pros, cons, publicApiImpact, elegance (1-10)',
  ].join('\n'),
  { schema: approachesSchema },
)

for (const a of approaches.approaches) {
  log(a.name + ': elegance=' + a.elegance + '/10 -- ' + a.pros[0])
}

// ── Phase 3: Evaluate ─────────────────────────────────────────────────

phase('evaluate')

const scored = await agent(
  [
    'You are evaluating architectural approaches for the AgentFlow TypeScript project at /home/caosen/GitHub/agentflow.',
    '',
    'Given these candidate approaches:',
    JSON.stringify(approaches.approaches, null, 2),
    '',
    'Project constraints:',
    '- Small codebase (~10 modules, ~1000 LOC), prefer simplicity',
    '- verbatimModuleSyntax: true',
    '- dependency-cruiser with tsPreCompilationDeps: true',
    '- Public API (index.ts barrel) must not change',
    '',
    'Score each approach (1-10) on: simplicity, typeSafety, conventionality, maintainability, robustness.',
    '',
    'Then pick the SINGLE best approach. Read all source files in src/ to verify your plan is correct.',
    'Produce a concrete implementation plan with exact files and code changes.',
  ].join('\n'),
  { schema: { type: 'object', properties: { recommendation: recommendationSchema, implementationPlan: planSchema }, required: ['recommendation', 'implementationPlan'] } },
)

// ── Phase 4: Recommend ────────────────────────────────────────────────

phase('recommend')

log('Recommended: ' + scored.recommendation.approachName)
log('Reasoning: ' + scored.recommendation.reasoning)
log(
  'Scores: simplicity=' +
    scored.recommendation.scores.simplicity +
    ' typeSafety=' +
    scored.recommendation.scores.typeSafety +
    ' conventionality=' +
    scored.recommendation.scores.conventionality +
    ' maintainability=' +
    scored.recommendation.scores.maintainability +
    ' robustness=' +
    scored.recommendation.scores.robustness,
)

return scored
