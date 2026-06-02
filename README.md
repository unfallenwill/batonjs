<p align="center">
  <img src="./assets/brand/batonjs-logo.svg" alt="BatonJS" width="560">
</p>

A lightweight workflow engine that orchestrates AI agents via pluggable SDK backends.
Write workflows as plain `.js`/`.ts` scripts — `parallel()`, `pipeline()`, and budget tracking built in.

**SDK backends:** [Anthropic Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) (default) · [CodeBuddy Agent SDK](https://www.npmjs.com/package/@tencent-ai/agent-sdk)

## Highlights

- **Scripts are workflows** — Write `.js` or `.ts` with top-level `await`; `agent()`, `parallel()`, `pipeline()`, and `workflow()` are injected globals
- **Structured output** — Pass a JSON Schema to `agent()` and get a validated object back
- **Dual SDK backend** — Anthropic Claude (default) or CodeBuddy, switch with a single `--sdk` flag
- **Budget control** — Set a USD limit; the engine tracks spend in real time and stops when the budget is exhausted
- **Fault-tolerant** — `agent()` returns `null` on failure instead of crashing your workflow

## Quick Start

Install:

```bash
npm install batonjs
```

Write a workflow script:

```js
// workflow.js
export const meta = {
  name: 'my-workflow',
  phases: [{ title: 'analyze' }, { title: 'summarize' }],
}

phase('analyze')
const findings = await parallel([
  () => agent('Check for security issues', {
    schema: { type: 'object', properties: { issues: { type: 'array' } }, required: ['issues'] },
    label: 'security',
  }),
  () => agent('Check for performance bottlenecks', { label: 'perf' }),
])

phase('summarize')
const summary = await agent(
  'Summarize: ' + JSON.stringify(findings.filter(Boolean)),
  { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
)

log('Done! ' + findings.filter(Boolean).length + ' reports')
return { summary }
```

Run from the CLI:

```bash
batonjs ./workflow.js
batonjs --sdk codebuddy --budget 5.0 ./workflow.js
batonjs --timeout 5 ./workflow.js
```

Or use the programmatic API:

```ts
import { Engine } from 'batonjs'

const engine = new Engine({
  scriptPath: './workflow.js',
  maxBudgetUsd: 2.0,
  sdk: 'anthropic',   // or 'codebuddy'
})

engine.on(event => {
  if (event.kind === 'log') console.log(event.message)
})

const result = await engine.run()

if (result.ok) {
  console.log('Result:', result.value.result)
  console.log('Cost: $' + result.value.totalCostUsd.toFixed(4))
}
```

## CLI

```
batonjs [options] <script>
```

| Flag | Description | Default |
|------|-------------|---------|
| `--args <json>` | Pass arguments as the `args` global | — |
| `--budget <usd>` | Max budget in USD | unlimited |
| `--concurrency <n>` | Max concurrent agents | 10 |
| `--cwd <dir>` | Working directory | `.` |
| `--model <name>` | Default model for agents | SDK default |
| `--sdk <name>` | `anthropic` or `codebuddy` | `anthropic` |
| `--timeout <min>` | Per-agent timeout in minutes | 2 |
| `-h, --help` | Show help | — |

## Script API

Your workflow script receives these globals:

| Global | Description |
|--------|-------------|
| `agent(prompt, opts?)` | Run an AI agent; returns the result or `null` on failure |
| `parallel(thunks)` | Run an array of async thunks concurrently; waits for all |
| `pipeline(items, ...stages)` | Stream each item through stages independently |
| `phase(title)` | Mark the current execution phase (for logging) |
| `log(message)` | Emit a log message |
| `budget` | `{ total, spent(), remaining() }` — real-time budget info |
| `args` | Custom arguments from `--args` or `EngineOptions.args` |
| `workflow(ref, args?)` | Run a nested sub-workflow (one level max) |

## License

MIT
