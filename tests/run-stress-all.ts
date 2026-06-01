import { Engine } from '../src/index.js'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const STRESS_DIR = './.agentflow/workflows/stress'

const files = (await readdir(STRESS_DIR)).filter((f) => f.endsWith('.js')).sort()

let passed = 0
let failed = 0

for (const file of files) {
  const scriptPath = join(STRESS_DIR, file)
  const label = file.replace('.js', '')
  process.stdout.write(`${label} ... `)

  const engine = new Engine({ scriptPath, cwd: process.cwd() })

  const result = await engine.run()

  if (result.ok) {
    console.log(`✅ ${result.value.durationMs / 1000}s`)
    passed++
  } else {
    console.log(`❌ ${result.error.message.slice(0, 80)}`)
    failed++
  }
}

console.log(`\n${'═'.repeat(40)}`)
console.log(`${passed} passed, ${failed} failed`)
setTimeout(() => process.exit(failed > 0 ? 1 : 0), 500).unref()
