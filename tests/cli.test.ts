import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const cliPath = resolve(__dirname, '../src/cli.ts')

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('npx', ['tsx', cliPath, ...args], {
      encoding: 'utf-8',
      timeout: 10_000,
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.status ?? 1,
    }
  }
}

describe('CLI argument validation', () => {
  it('rejects --budget with non-numeric value', () => {
    const result = runCli(['dummy.js', '--budget', 'abc'])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('requires a number')
  })

  it('rejects --concurrency with non-numeric value', () => {
    const result = runCli(['dummy.js', '--concurrency', 'xyz'])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('requires an integer')
  })

  it('accepts --budget with valid number', () => {
    const result = runCli(['dummy.js', '--budget', '5.0'])
    // Will fail because dummy.js doesn't exist, but should NOT fail on --budget
    expect(result.stderr).not.toContain('requires a number')
  })

  it('accepts --concurrency with valid integer', () => {
    const result = runCli(['dummy.js', '--concurrency', '5'])
    expect(result.stderr).not.toContain('requires an integer')
  })
})
