import { Engine } from '../src/index.js';

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: npx tsx test/run-stress-single.ts <script-path>');
  process.exit(1);
}

const engine = new Engine({ scriptPath, cwd: process.cwd() });

engine.on((event) => {
  switch (event.kind) {
    case 'workflow_start':
      console.log(`🚀 ${event.meta?.name ?? scriptPath}`);
      break;
    case 'phase':
      console.log(`📍 ${event.title}`);
      break;
    case 'log':
      console.log(`  💬 ${event.message}`);
      break;
    case 'agent_start':
      console.log(`  🤖 → ${event.label ?? 'agent'}`);
      break;
    case 'agent_end':
      console.log(`  ✅ ← ${event.label ?? 'agent'} ($${event.cost.toFixed(4)})`);
      break;
    case 'agent_error':
      console.log(`  ❌ ← ${event.label ?? 'agent'}: ${event.error.slice(0, 80)}`);
      break;
    case 'workflow_end':
      console.log(`🏁 ${event.success ? '✅' : '❌'} $${event.totalCost.toFixed(4)} ${(event.duration_ms / 1000).toFixed(1)}s`);
      break;
    case 'workflow_error':
      console.log(`💥 ${event.error}`);
      break;
  }
});

const result = await engine.run();
if (!result.ok) {
  console.error(`\n💥 ${result.error.message}`);
}
// Force exit — SDK child processes may linger on 429 errors
setTimeout(() => process.exit(result?.ok ? 0 : 1), 1000).unref();
