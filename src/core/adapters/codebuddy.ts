import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import type { SdkProvider, SdkQueryHandle } from '../sdk-types.js'

/** Generic transcript message shape for parsing */
interface TranscriptMessage {
  type?: string
  message?: {
    content?: Array<{ type?: string; text?: string }>
  }
}

/**
 * Create a Stop hook that validates the last assistant message against a JSON schema.
 * If validation fails, returns { continue: false, reason: "..." } to make the model regenerate.
 */
export function createSchemaValidationHook(schema: Record<string, unknown>) {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)

  return async (input: { transcript_path: string }): Promise<Record<string, unknown>> => {
    try {
      // Read transcript JSONL and find the last assistant message
      const content = readFileSync(input.transcript_path, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      let lastAssistantText: string | undefined

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const msg = JSON.parse(lines[i]) as TranscriptMessage
          if (msg.type === 'assistant' && msg.message?.content) {
            const textBlocks = msg.message.content.filter(
              (block): block is { type: 'text'; text: string } =>
                block.type === 'text' && typeof block.text === 'string',
            )
            if (textBlocks.length > 0) {
              lastAssistantText = textBlocks.map((b) => b.text).join('')
              break
            }
          }
        } catch {
          // Skip malformed lines
          continue
        }
      }

      if (lastAssistantText === undefined) {
        return { continue: false, reason: 'No assistant message found in transcript to validate' }
      }

      // Strip markdown fences if present
      const stripped = lastAssistantText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/, '')

      let parsed: unknown
      try {
        parsed = JSON.parse(stripped)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { continue: false, reason: `Output is not valid JSON: ${msg}` }
      }

      if (!validate(parsed)) {
        const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ')
        return { continue: false, reason: `Schema validation failed: ${errors}` }
      }

      return { continue: true }
    } catch (e) {
      // If we can't read the transcript or anything else goes wrong, don't block the stop
      const msg = e instanceof Error ? e.message : String(e)
      return { continue: true } // Don't block on internal errors
    }
  }
}

/**
 * Create an SdkProvider backed by @tencent-ai/agent-sdk.
 * Uses dynamic import() so only the chosen SDK needs to be installed.
 */
export async function createCodebuddyAdapter(): Promise<SdkProvider> {
  const sdk = await import('@tencent-ai/agent-sdk')
  return {
    query: (params) => {
      const opts: Record<string, unknown> = {
        ...params.options,
        settingSources: ['user', 'project'],
      }

      // When schema is provided, register a Stop hook to validate output in-session
      if (params.options.outputFormat) {
        const schema = params.options.outputFormat.schema
        opts.hooks = {
          Stop: [
            {
              hooks: [createSchemaValidationHook(schema)],
            },
          ],
        }
      }

      return sdk.query({
        prompt: params.prompt,
        options: opts as NonNullable<Parameters<typeof sdk.query>[0]['options']>,
      }) as SdkQueryHandle
    },
  }
}
