import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createSchemaValidationHook } from '../src/core/adapters/codebuddy.js'

describe('createSchemaValidationHook', () => {
  const testDir = join(tmpdir(), `batonjs-hook-test-${Date.now()}`)
  const transcriptPath = join(testDir, 'transcript.jsonl')

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  const schema = {
    type: 'object',
    properties: { name: { type: 'string' }, age: { type: 'number' } },
    required: ['name'],
  }

  function writeTranscript(messages: Array<Record<string, unknown>>) {
    const lines = messages.map((m) => JSON.stringify(m)).join('\n')
    writeFileSync(transcriptPath, lines)
  }

  it('returns continue:true when output matches schema', async () => {
    writeTranscript([
      { type: 'user', message: { role: 'user', content: 'test' } },
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: '{"name":"Alice","age":30}' }],
        },
      },
    ])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result).toEqual({ continue: true })
  })

  it('returns continue:false when output fails schema validation', async () => {
    writeTranscript([
      { type: 'user', message: { role: 'user', content: 'test' } },
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: '{"name":42}' }],
        },
      },
    ])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result.continue).toBe(false)
    expect(result.reason).toContain('Schema validation failed')
  })

  it('returns continue:false when output is not valid JSON', async () => {
    writeTranscript([
      { type: 'user', message: { role: 'user', content: 'test' } },
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'This is not JSON at all' }],
        },
      },
    ])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result.continue).toBe(false)
    expect(result.reason).toContain('not valid JSON')
  })

  it('returns continue:false when no assistant message is found', async () => {
    writeTranscript([{ type: 'user', message: { role: 'user', content: 'test' } }])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result.continue).toBe(false)
    expect(result.reason).toContain('No assistant message')
  })

  it('handles markdown-fenced JSON output', async () => {
    writeTranscript([
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: '```json\n{"name":"Bob"}\n```' }],
        },
      },
    ])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result).toEqual({ continue: true })
  })

  it('uses the last assistant message when multiple exist', async () => {
    writeTranscript([
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: '{"name":42}' }],
        },
      },
      {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: '{"name":"Alice"}' }],
        },
      },
    ])

    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: transcriptPath })
    expect(result).toEqual({ continue: true })
  })

  it('returns continue:true when transcript file cannot be read', async () => {
    const hook = createSchemaValidationHook(schema)
    const result = await hook({ transcript_path: '/nonexistent/path/transcript.jsonl' })
    // Don't block stop on internal errors
    expect(result).toEqual({ continue: true })
  })
})
