# 02 - Core API：meta、agent()、phase()、log()、args 详解

## meta —— 工作流身份证

每个脚本**必须**以 `meta` 开头：

```javascript
export const meta = {
  name: 'my-workflow',          // 必填：标识符，用于日志和权限对话框
  description: '一句话描述',     // 必填：显示给用户
  phases: [                     // 可选：阶段定义，匹配 phase() 调用
    { title: 'Scan' },
    { title: 'Fix', detail: '逐个修复发现的问题' },  // detail 可选，补充说明
    { title: 'Verify', model: 'opus' },              // model 可选，覆盖该阶段模型
  ],
}
```

**铁律：`meta` 必须是纯字面量。** 以下写法全部非法：

```javascript
// ❌ 使用变量
const myName = 'foo'
export const meta = { name: myName }

// ❌ 模板插值
export const meta = { name: `workflow-${Date.now()}` }

// ❌ 展开运算符
export const meta = { ...baseConfig, name: 'foo' }
```

`phases` 中的 `title` 必须与脚本中 `phase('Scan')` 的参数**完全匹配**（区分大小写）。如果 `phase()` 调用的 title 没有在 `meta.phases` 中定义，它仍然可以运行，只是会自动获得一个独立的进度组。

## agent() —— 启动子 agent

```javascript
const result = await agent(prompt, options?)
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt` | `string` | 给子 agent 的任务描述 |
| `options.schema` | `object` | JSON Schema，强制结构化输出 |
| `options.label` | `string` | 覆盖 UI 中显示的标签（默认用 prompt 前30字） |
| `options.phase` | `string` | 显式指定该 agent 归属哪个 phase 进度组 |
| `options.model` | `'sonnet' \| 'opus' \| 'haiku'` | 覆盖模型（不推荐随意用，默认继承主循环模型） |
| `options.isolation` | `'worktree'` | 在独立 git worktree 中运行（有开销 ~200-500ms+磁盘，仅在并行写入时使用） |
| `options.agentType` | `string` | 使用自定义 subagent 类型（如 `'Explore'`、`'code-reviewer'`） |

### 返回值

- **无 schema**：返回 agent 的最终文本（`string`）
- **有 schema**：返回经过 JSON Schema 验证的对象，**无需手动解析**

```javascript
// 自由文本
const summary = await agent('总结这段代码')

// 结构化输出
const bugs = await agent('找出所有 bug', {
  schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            file: { type: 'string' },
          },
          required: ['title', 'severity', 'file'],
        },
      },
    },
    required: ['findings'],
  },
})
// bugs.findings[0].title 可以直接用
```

### 用户跳过时

如果用户在中途跳过某个 agent，`agent()` 返回 `null`。处理方式：

```javascript
const results = await parallel(tasks.map(t => () => agent(t.prompt)))
const valid = results.filter(Boolean)  // 过滤掉 null
```

## phase() —— 进度标记

```javascript
phase('Scan')    // 后续的 agent() 调用归入 "Scan" 组
// ... agent calls ...
phase('Fix')     // 切换到 "Fix" 组
// ... agent calls ...
```

- 仅影响 UI 进度树展示，**不影响执行逻辑**
- 在 `pipeline()` / `parallel()` 内部，建议用 `options.phase` 显式指定，避免竞态：

```javascript
await pipeline(
  items,
  item => agent(scanPrompt, { label: `scan:${item.id}`, phase: 'Scan' }),
  result => agent(fixPrompt, { label: `fix:${result.id}`, phase: 'Fix' }),
)
```

## log() —— 输出进度消息

```javascript
log(`已扫描 ${scanned}/${total} 个文件`)
log(`发现 ${bugs.length} 个 bug，剩余预算 ${Math.round(budget.remaining()/1000)}k tokens`)
```

- 消息显示在进度树上方，以叙述行形式呈现
- 不影响返回值，纯粹是给用户看的

## args —— 接收外部参数

```javascript
// 调用方传入
// Workflow({ script, args: ['src/api.ts', 'src/db.ts'] })

const files = args  // args 就是传入的值，这里是 ['src/api.ts', 'src/db.ts']
for (const file of files) {
  await agent(`审查文件 ${file}`)
}
```

**重要：** `args` 接收的是原始 JSON 值，不是 JSON 字符串。

```javascript
// 调用方：
Workflow({ args: ['a.ts', 'b.ts'] })        // ✅ args = ['a.ts', 'b.ts']
Workflow({ args: '["a.ts", "b.ts"]' })       // ❌ args = '["a.ts", "b.ts"]'（字符串）
```

## 可用但受限的 JS 内置

| 可用 | 不可用（会 throw） |
|------|---------------------|
| `JSON`, `Math`, `Array`, `Object`, `Map`, `Set` | `Date.now()`, `Math.random()`, 无参 `new Date()` |
| `String`, `Number`, `Boolean` | `require()`, `import`, `fs`, `process` |
| `Promise`, `async/await` | `setTimeout`, `setInterval` |

不可用的原因是它们会破坏**缓存/恢复**机制——同一个脚本跑两次必须产生相同的调用序列。
