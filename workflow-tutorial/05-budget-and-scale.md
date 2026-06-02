# 05 - Budget and Scale：预算、并发、缓存与恢复

---

## Budget —— Token 预算管理

当用户用 `"+500k"` 之类的指令设置 token 目标时，`budget` 对象可用：

```javascript
budget.total      // number | null —— 用户设置的总预算，未设置时为 null
budget.spent()    // 返回本轮已花费的 output tokens（主循环 + 所有 workflow 共享）
budget.remaining() // 返回 max(0, total - spent())，无限制时返回 Infinity
```

### 用法 1：根据预算动态缩放

```javascript
// 没有预算 → 默认 5 个 finder；有预算 → 每 100k token 一个 finder
const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5

const results = await parallel(
  Array.from({ length: FLEET }, (_, i) => () =>
    agent(`Finder #${i}: 搜索代码中的问题`, { schema: BUGS_SCHEMA })
  )
)
```

### 用法 2：循环直到预算耗尽

```javascript
const bugs = []
while (budget.total && budget.remaining() > 50_000) {
  const result = await agent('找出更多 bug', { schema: BUGS_SCHEMA })
  bugs.push(...result.bugs)
  log(`${bugs.length} found, ${Math.round(budget.remaining() / 1000)}k remaining`)
}
```

**铁律：** `budget.total` 是硬上限，不是建议值。`spent()` 达到 `total` 后，后续 `agent()` 调用会 throw。务必在循环中检查。

---

## Concurrency —— 并发控制

### 自动并发限制

- 每个 workflow 的并发 `agent()` 调用上限 = `min(16, cpu_cores - 2)`
- 超出上限的调用自动排队，有 slot 释放时执行
- `parallel([100 items])` 仍然可以跑完——只是同一时刻最多 ~10 个在运行

### 总 agent 数上限

- 一个 workflow 生命周期内最多 1000 个 agent —— 防止失控循环的后备机制

### 对性能的影响

- `isolation: 'worktree'` 每个额外 ~200-500ms 设置 + 磁盘开销
- 仅在 agent 并行**写入同一仓库**时才需要 worktree 隔离
- 只读任务不需要隔离

---

## Caching —— 缓存机制

### 工作原理

每次 workflow 调用会被持久化为脚本文件。同一脚本 + 同一 `args` = 100% 缓存命中。

### 哪些会破坏缓存

| 操作 | 影响 |
|------|------|
| 修改 `meta` 或脚本逻辑 | 缓存失效 |
| 修改 `agent()` 的 prompt 或 options | 从该调用开始失效，后续重新执行 |
| 未修改的 `agent()` 前缀 | 直接返回缓存结果，瞬间完成 |

### 为什么 Date.now() / Math.random() 被禁用

```javascript
// ❌ 每次运行 prompt 不同 → 缓存永远不命中
const result = await agent(`在 ${Date.now()} 时扫描`)

// ✅ 通过 args 传入时间戳
// 调用方: Workflow({ args: { timestamp: 1700000000 } })
const result = await agent(`在 ${args.timestamp} 时扫描`)
```

---

## Resume —— 恢复中断的 Workflow

### 场景

workflow 运行到一半被暂停、kill、或脚本编辑后需要继续。

### 用法

```javascript
// 首次调用，返回 runId
const { runId } = await Workflow({ script })

// 暂停后恢复
await Workflow({
  scriptPath: '/path/to/saved/script.js',
  resumeFromRunId: runId,  // 用首次返回的 runId
})
```

### 恢复逻辑

1. 对比当前脚本与上次的调用序列
2. **最长不变前缀**的 `agent()` 调用直接返回缓存结果
3. 第一个被编辑/新增的调用开始重新执行
4. 后续调用全部重新执行

### 限制

- 同一会话内有效
- 恢复前需要先 `TaskStop` 停止之前的运行

---

## 内联子 Workflow

```javascript
// 在 workflow 内调用另一个 workflow
const subResult = await workflow('named-workflow', args)
// 或
const subResult = await workflow({ scriptPath: '/path/to/script.js' }, args)
```

**特性：**
- 子 workflow 共享父的并发上限、agent 计数器、中断信号、token 预算
- 子 workflow 的 agent 出现在父 workflow 进度树的 "▸ name" 子组中
- 子 workflow 的 token 计入 `budget.spent()`
- 只能嵌套一层：`workflow()` 在子 workflow 内再调用会 throw

---

## 实战：根据任务规模选择参数

| 任务规模 | agent 数 | isolation | schema | parallel/pipeline |
|----------|----------|-----------|--------|-------------------|
| 小（<5 文件审查） | 1-3 | 不需要 | 可选 | pipeline |
| 中（5-20 文件） | 5-15 | 不需要 | 推荐 | pipeline + 阶段内 parallel |
| 大（全仓库审计） | 20-100 | 需要并行写入时用 | 必须 | pipeline + loop-until-dry |
| 超大（+500k 预算） | 100+ | 谨慎使用 | 必须 | 全套模式组合 |

### 无声截断警告

如果 workflow 有意限制覆盖范围（top-N、无重试、采样），务必用 `log()` 记录被丢弃的内容：

```javascript
const topBugs = allBugs.slice(0, 20)
if (allBugs.length > 20) {
  log(`⚠️ 仅处理前 20 个 bug，共 ${allBugs.length} 个（跳过 ${allBugs.length - 20} 个）`)
}
```

无声截断会让用户以为"全覆盖了"，实际上并没有。
