import { defineConfig } from 'tsdown'

export default defineConfig([
  // Library: ESM + CJS with types
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'node',
    dts: true,
    shims: true,
    clean: true,
  },
  // CLI: ESM only (uses top-level await)
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    platform: 'node',
    shims: true,
  },
])
