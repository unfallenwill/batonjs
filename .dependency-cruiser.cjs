/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'No circular dependencies',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      comment: 'No orphan modules (unreachable from index.ts)',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: 'cli\\.ts$',
      },
      to: {},
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    combinedDependencies: false,
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['es6'],
  },
}
