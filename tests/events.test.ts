import { describe, it, expect, vi } from 'vitest'
import { EngineEventBus } from '../src/core/events.js'

describe('EngineEventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EngineEventBus()
    const received: string[] = []
    bus.on((e) => received.push(e.kind))
    bus.emit({ kind: 'phase', title: 'test' })
    bus.emit({ kind: 'log', message: 'hello' })
    expect(received).toEqual(['phase', 'log'])
  })

  it('unsubscribe stops delivery', () => {
    const bus = new EngineEventBus()
    const received: string[] = []
    const unsub = bus.on((e) => received.push(e.kind))
    bus.emit({ kind: 'phase', title: 'a' })
    unsub()
    bus.emit({ kind: 'log', message: 'b' })
    expect(received).toEqual(['phase'])
  })

  it('delivers to multiple subscribers', () => {
    const bus = new EngineEventBus()
    let count = 0
    bus.on(() => count++)
    bus.on(() => count++)
    bus.emit({ kind: 'phase', title: 'x' })
    expect(count).toBe(2)
  })

  it('double unsubscribe is a no-op', () => {
    const bus = new EngineEventBus()
    const received: string[] = []
    const unsub = bus.on((e) => received.push(e.kind))
    unsub()
    unsub() // second call: idx === -1 branch
    bus.emit({ kind: 'log', message: 'should not receive' })
    expect(received).toEqual([])
  })

  it('emits to remaining subscribers after one unsubscribes', () => {
    const bus = new EngineEventBus()
    const received: string[] = []
    const unsub1 = bus.on((e) => received.push(`a:${e.kind}`))
    bus.on((e) => received.push(`b:${e.kind}`))
    bus.emit({ kind: 'phase', title: 'first' })
    unsub1()
    bus.emit({ kind: 'log', message: 'second' })
    expect(received).toEqual(['a:phase', 'b:phase', 'b:log'])
  })

  it('handler throwing error does not break other handlers', () => {
    const bus = new EngineEventBus()
    const received: string[] = []
    bus.on((e) => received.push(`first:${e.kind}`))
    bus.on(() => {
      throw new Error('boom')
    })
    bus.on((e) => received.push(`third:${e.kind}`))
    bus.emit({ kind: 'phase', title: 'test' })
    expect(received).toEqual(['first:phase', 'third:phase'])
  })

  it('handler throwing error logs to console.error', () => {
    const bus = new EngineEventBus()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    bus.on(() => {
      throw new Error('boom')
    })
    bus.emit({ kind: 'log', message: 'test' })
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('[AgentFlow] Event handler threw:', expect.any(Error))
    errorSpy.mockRestore()
  })
})
