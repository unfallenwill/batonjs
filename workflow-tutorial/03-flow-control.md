# 03 - Flow Control：pipeline() vs parallel()，何时用哪个

## 核心区别

| | `pipeline()` | `parallel()` |
|---|---|---|
| **语义** | 流水线——每个 item 独立走完所有阶段 | 屏障——等所有任务完成才继续 |
| **等待** | 不等齐，快的 item 先进下一阶段 | 必须等齐，慢的拖住全部 |
| **返回** | 各 item 最终结果的数组 | 各任务结果的数组（含可能为 null 的项） |
| **默认推荐** | ✅ 大多数情况用这个 | ❌ 只在真正需要全部结果时用 |

## pipeline() —— 默认选择

```javascript
const results = await pipeline(
  items,                           // 输入数组
  item => agent(processItem),      // stage 1
  result => agent(enrichResult),   // stage 2
  enriched => agent(finalize),     // stage 3
)
```

**特点：**
- Item A 在 stage 3 时，Item B 可能还在 stage 1 —— 没有阶段间屏障
- 墙钟时间 = 最慢单条链路，不是各阶段最慢之和
- 每个阶段回调接收 `(prevResult, originalItem, index)`

```javascript
const results = await pipeline(
  files,
  // stage 1: 扫描
  (file, originalFile, idx) => agent(`扫描 ${file}`, {
    label: `scan:${originalFile.name}`,
    phase: 'Scan',
  }),
  // stage 2: 修复（可以利用 originalFile 的信息）
  (scanResult, originalFile, idx) => agent(`修复 ${originalFile.path}: ${scanResult}`,
    { label: `fix:${originalFile.name}`, phase: 'Fix' }),
)
```

如果某个阶段 throw，该 item 变为 `null` 并跳过后续阶段。

## parallel() —— 需要屏障时才用

```javascript
const results = await parallel([
  () => agent('搜索 frontend 的 bug'),
  () => agent('搜索 backend 的 bug'),
  () => agent('搜索 infra 的 bug'),
])
// results[0], results[1], results[2] 全部就绪后才继续

const allBugs = results.filter(Boolean).flatMap(r => r.findings)
```

**特点：**
- 所有 thunk 并发启动
- 必须等**全部**完成才返回
- 单个 throw 不会导致整体失败——对应位置返回 `null`

### parallel() 在阶段间组合

```javascript
// 先并行收集所有发现，再统一处理
const findings = await parallel(
  dimensions.map(d => () => agent(d.prompt, { schema: FINDINGS_SCHEMA }))
)

// 这里需要所有结果才能去重
const deduped = dedupeByFileAndLine(
  findings.filter(Boolean).flatMap(r => r.findings)
)

// 再并行验证
const verified = await parallel(
  deduped.map(f => () => agent(verifyPrompt(f), { schema: VERDICT_SCHEMA }))
)
```

## 判断标准：何时用 parallel()？

**需要 parallel() 的信号：**
- 阶段 N 需要**跨 item 汇总**（去重、合并、排序后才能继续）
- 早期退出：如果总数为 0 就跳过后续（"0 个 bug → 跳过验证"）
- 阶段 N 的 prompt 需要引用"其他 item 的结果"做比较

**不需要 parallel() 的信号（用 pipeline）：**
- "我需要先 flatten/map/filter" —— 直接在 pipeline 阶段内做
- "阶段之间概念上不同" —— pipeline 正是为此设计
- "代码更整洁" —— 屏障的延迟是真实的

## 常见错误模式

### ❌ 不必要的屏障

```javascript
// 浪费：stage 2 不需要跨 item 上下文
const a = await parallel(items.map(i => () => agent(stage1(i))))
const b = a.map(r => transform(r))
const c = await parallel(b.map(i => () => agent(stage2(i))))
```

### ✅ 用 pipeline 替代

```javascript
const c = await pipeline(
  items,
  i => agent(stage1(i)),
  r => transform([r]).flat(),  // 转换在阶段内完成
  t => agent(stage2(t)),
)
```

### ❌ 在 pipeline 内部嵌套 parallel 却忘了处理 null

```javascript
await pipeline(
  items,
  item => parallel([
    () => agent(riskyTask),  // 可能 throw → null
    () => agent(safeTask),
  ]),
  // [null, result] ← 需要过滤
  ([a, b]) => agent(combine(a, b)),  // null 会炸
)
```

### ✅ 过滤 null

```javascript
await pipeline(
  items,
  item => parallel([
    () => agent(riskyTask),
    () => agent(safeTask),
  ]).then(results => results.filter(Boolean)),
  filtered => agent(combine(filtered)),
)
```

## 混合使用

实际复杂 workflow 常常混合 pipeline 和 parallel：

```javascript
// pipeline 做主线，parallel 做阶段内的并发
const results = await pipeline(
  items,
  item => agent(scan(item)),                                    // stage 1: 独立扫描
  scanResult => parallel(                                       // stage 2: 多角度验证
    ['correctness', 'security', 'perf'].map(lens => () =>
      agent(`从 ${lens} 角度验证: ${scanResult}`, { schema: VERDICT })
    )
  ),
  verdicts => ({ scanResult, verdicts: verdicts.filter(Boolean) })  // stage 3: 汇总
)
```
