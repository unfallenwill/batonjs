# 06 - Recipes：组合模式、真实案例与常见陷阱

---

## 完整案例 1：代码审查（Exhaustive Review）

**目标：** 全面审查代码变更，确保高置信度。

```javascript
export const meta = {
  name: 'exhaustive-review',
  description: '多维度代码审查，逐项对抗验证',
  phases: [
    { title: 'Find' },
    { title: 'Verify' },
    { title: 'Synthesize' },
  ],
}

const DIMENSIONS = [
  { key: 'bugs', prompt: '找出代码中的正确性 bug' },
  { key: 'security', prompt: '找出安全漏洞' },
  { key: 'perf', prompt: '找出性能问题' },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          description: { type: 'string' },
        },
        required: ['title', 'file', 'description'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    isReal: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['isReal', 'reason'],
}

// ── Phase 1: Find ──
phase('Find')
const findings = await parallel(
  DIMENSIONS.map(d => () =>
    agent(d.prompt, {
      label: `find:${d.key}`,
      phase: 'Find',
      schema: FINDINGS_SCHEMA,
    })
  )
)

const allFindings = findings
  .filter(Boolean)
  .flatMap(r => r.findings)

log(`发现 ${allFindings.length} 个潜在问题`)

// ── Phase 2: Verify (adversarial) ──
phase('Verify')
const confirmed = []

for (const finding of allFindings) {
  const votes = await parallel(
    Array.from({ length: 3 }, () => () =>
      agent(
        `尝试反驳以下发现。不确定时默认反驳=true。\n` +
        `发现: ${finding.title}\n文件: ${finding.file}\n描述: ${finding.description}`,
        { phase: 'Verify', schema: VERDICT_SCHEMA }
      )
    )
  )

  const survived = votes
    .filter(Boolean)
    .filter(v => !v.isReal)  // isReal=false 表示反驳失败 → 发现成立
    .length >= 2

  if (survived) {
    confirmed.push(finding)
  }
}

log(`验证通过 ${confirmed.length}/${allFindings.length}`)

// ── Phase 3: Synthesize ──
phase('Synthesize')
const report = await agent(
  `基于以下已验证的发现，生成最终审查报告:\n${JSON.stringify(confirmed, null, 2)}`,
  { phase: 'Synthesize' }
)

return { confirmed, report }
```

---

## 完整案例 2：穷尽式 Bug 搜索

**目标：** 反复搜索直到确认没有新 bug，使用预算控制深度。

```javascript
export const meta = {
  name: 'exhaustive-bug-hunt',
  description: '穷尽式 bug 搜索，直到枯竭',
  phases: [
    { title: 'Find' },
    { title: 'Verify' },
  ],
}

const FINDERS = [
  '搜索空指针 / None 访问',
  '搜索竞态条件和并发问题',
  '搜索资源泄漏和未关闭的连接',
]

const BUGS_SCHEMA = {
  type: 'object',
  properties: {
    bugs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          desc: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
        },
        required: ['desc', 'file'],
      },
    },
  },
  required: ['bugs'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['real', 'reason'],
}

const seen = new Set()
const confirmed = []
let dry = 0

while (dry < 2 && (budget.total ? budget.remaining() > 50_000 : true)) {
  // ── Find ──
  phase('Find')
  const found = (await parallel(
    FINDERS.map(f => () =>
      agent(f, { phase: 'Find', schema: BUGS_SCHEMA })
    ))
  ).filter(Boolean).flatMap(r => r.bugs)

  const fresh = found.filter(b => !seen.has(`${b.file}:${b.line}:${b.desc}`))

  if (!fresh.length) {
    dry++
    log(`本轮无新发现，dry=${dry}/2`)
    continue
  }

  dry = 0
  fresh.forEach(b => seen.add(`${b.file}:${b.line}:${b.desc}`))
  log(`发现 ${fresh.length} 个新 bug（总计见 ${seen.size}）`)

  // ── Verify ──
  phase('Verify')
  const verified = await parallel(
    fresh.map(b => () =>
      agent(
        `从 correctness 和 reproducibility 两个角度验证: ${b.desc} (${b.file}:${b.line})`,
        { phase: 'Verify', schema: VERDICT_SCHEMA }
      )
    )
  )

  confirmed.push(
    ...verified
      .filter(Boolean)
      .filter(v => v.real)
      .map((v, i) => ({ ...fresh[i], verdict: v }))
  )
}

log(`搜索结束，确认 ${confirmed.length} 个真实 bug`)
return { confirmed, totalSeen: seen.size }
```

---

## 常见陷阱

### 1. parallel 返回值包含 null

```javascript
// ❌ 忘记过滤
const results = await parallel(tasks.map(t => () => agent(t.prompt)))
results.forEach(r => r.findings)  // TypeError: Cannot read properties of null

// ✅ 始终过滤
const results = await parallel(tasks.map(t => () => agent(t.prompt)))
const valid = results.filter(Boolean)
```

### 2. pipeline 阶段间传值丢失原始 item

```javascript
// ❌ stage 2 拿不到 originalFile
await pipeline(files, file => agent(scan(file)), scanResult => {
  // 这里 scanResult 是 agent 返回值，file 已经丢了
  return agent(fix(scanResult, ???))  // 原始文件名去哪了？
})

// ✅ 用第三个参数 originalItem
await pipeline(
  files,
  (file, originalFile, idx) => agent(scan(file)),
  (scanResult, originalFile, idx) => agent(fix(scanResult, originalFile))
)
```

### 3. 忘记在 parallel/pipeline 内部指定 phase

```javascript
// ❌ 竞态：多个并行 agent 的 phase 状态混乱
await parallel(items.map(item => () => {
  phase('Scan')   // 多个 agent 同时设置 phase，互相覆盖
  return agent(scan(item))
}))

// ✅ 用 options.phase 显式指定
await parallel(items.map(item => () =>
  agent(scan(item), { phase: 'Scan' })
))
```

### 4. worktree 隔离滥用

```javascript
// ❌ 只读任务不需要 worktree——白白增加 200-500ms 开销
await parallel(files.map(f => () =>
  agent(`读取并分析 ${f}`, { isolation: 'worktree' })  // 不需要！
))

// ✅ 只在并行写入时使用
await parallel(files.map(f => () =>
  agent(`修改 ${f}`, { isolation: 'worktree' })  // 并行写入 → 需要
))
```

### 5. args 传字符串而非 JSON 值

```javascript
// ❌ 调用方传字符串
Workflow({ args: '["a.ts", "b.ts"]' })
// 脚本里 args = '["a.ts", "b.ts"]'，args.filter 报错

// ✅ 传实际 JSON 值
Workflow({ args: ['a.ts', 'b.ts'] })
// 脚本里 args = ['a.ts', 'b.ts']
```

### 6. loop-until-dry 用 confirmed 去重而非 seen

```javascript
// ❌ 用 confirmed 去重：被拒绝的发现下一轮又冒出来
const fresh = found.filter(b => !confirmed.has(key(b)))

// ✅ 用 seen（所有见过的）去重
const fresh = found.filter(b => !seen.has(key(b)))
```

### 7. 忘记处理 schema 不匹配

有 schema 时，如果 agent 输出不匹配，**系统会自动重试**，不需要手动处理。但你要确保 schema 写对——常见错误是 `required` 字段遗漏或类型写错。

---

## 模式组合速查

```
搜索任务
├── 覆盖面不确定 → Multi-Modal Sweep + Loop-Until-Dry
├── 假阳性多 → + Adversarial Verify
└── 遗漏担心 → + Completeness Critic

方案生成
├── 方案空间大 → Judge Panel
└── 需要嫁接优点 → 综合胜出 + 嫁接亚军

代码审查
├── 标准流程 → pipeline(扫描, 对抗验证, 汇总)
└── 穷尽式 → Loop-Until-Dry + 多角度验证 + Completeness Critic

大规模迁移
├── 发现站点 → pipeline(扫描, 转换, 验证)
└── 并行写入 → isolation: 'worktree'
```
