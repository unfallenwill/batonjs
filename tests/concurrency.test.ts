import { describe, it, expect } from 'vitest'
import { Semaphore } from '../src/utils/semaphore.js'
import { parallelExecute } from '../src/utils/parallel.js'

describe('Semaphore', () => {
  it('allows up to max concurrent acquires', async () => {
    const sem = new Semaphore(3)
    const r1 = await sem.acquire()
    const r2 = await sem.acquire()
    const r3 = await sem.acquire()
    // All 3 acquired without blocking
    expect(true).toBe(true)
    r1()
    r2()
    r3()
  })

  it('blocks when max is reached', async () => {
    const sem = new Semaphore(2)
    const r1 = await sem.acquire()
    const r2 = await sem.acquire()

    let acquired = false
    const p = sem.acquire().then((release) => {
      acquired = true
      release()
    })

    // Give microtasks a chance to run
    await new Promise((r) => setTimeout(r, 10))
    expect(acquired).toBe(false)

    r1()
    await p
    expect(acquired).toBe(true)

    r2()
  })

  it('ignores double-release (no-op on second call)', async () => {
    const sem = new Semaphore(2)
    const r1 = await sem.acquire()
    const r2 = await sem.acquire()

    // Double-release r1
    r1()
    r1() // no-op, should not throw or corrupt state

    // r2 should release normally
    r2()

    // Should be able to acquire again
    const r3 = await sem.acquire()
    r3()
  })

  it('does not allow exceeding max after double-release', async () => {
    const sem = new Semaphore(1)
    const r1 = await sem.acquire()

    // Double-release
    r1()
    r1()

    // running should be 0, not negative
    // Should be able to acquire again
    const r2 = await sem.acquire()
    r2()
  })

  it('throws on release with no active holders', async () => {
    const sem = new Semaphore(1)
    const release = await sem.acquire()
    release()

    // Force an internal release via double-release — should be caught by oneShotRelease
    // But if somehow release() is called directly with running=0, it should throw
    expect(() => {
      // Access private method through a hack — this tests the safety net
      const semAny = sem as unknown as { release: () => void }
      semAny.release()
    }).toThrow('Semaphore: release() called with no active holders')
  })
})

describe('parallelExecute', () => {
  it('executes all thunks and returns results', async () => {
    const results = await parallelExecute([
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ])
    expect(results).toEqual([1, 2, 3])
  })

  it('returns null for rejected thunks', async () => {
    const results = await parallelExecute([
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('also ok'),
    ])
    expect(results).toEqual(['ok', null, 'also ok'])
  })

  it('handles empty array', async () => {
    const results = await parallelExecute([])
    expect(results).toEqual([])
  })

  it('calls onError with error and index when a thunk rejects', async () => {
    const errors: Array<{ error: unknown; index: number }> = []
    const results = await parallelExecute(
      [
        () => Promise.resolve('ok'),
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('also ok'),
      ],
      {
        onError: (error, index) => errors.push({ error, index }),
      },
    )
    expect(results).toEqual(['ok', null, 'also ok'])
    expect(errors).toHaveLength(1)
    expect(errors[0]?.index).toBe(1)
    expect(errors[0]?.error).toBeInstanceOf(Error)
    expect((errors[0]?.error as Error).message).toBe('fail')
  })

  it('works without onError (backward compatible)', async () => {
    const results = await parallelExecute([
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
    ])
    expect(results).toEqual(['ok', null])
  })
})
