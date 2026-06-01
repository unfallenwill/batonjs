import type { Semaphore } from '../utils/semaphore.js'
import type { BudgetTracker } from './budget.js'
import type { EngineEventBus } from './events.js'
import type { EngineOptions } from '../types.js'

/** Resolve PermissionMode from EngineOptions (same local alias used in types.ts) */
type PermissionMode = NonNullable<EngineOptions['permissionMode']>

/** Internal context passed to executeAgent() */
export interface AgentContext {
  semaphore: Semaphore
  budget: BudgetTracker
  bus: EngineEventBus
  cwd?: string | undefined
  defaultModel?: string | undefined
  permissionMode?: PermissionMode | undefined
  signal?: AbortSignal | undefined
}
