# 01 - Quick Start：Workflow 是什么，怎么写第一个

## Workflow 解决什么问题

当你需要：
- **并行**派发多个子任务给不同 agent
- 按固定**阶段**串联工作（扫描 → 分析 → 修复）
- 用**循环**反复执行直到条件满足
- 对结果做**质量把关**（多方验证、对抗审核）

如果只是单次调用一个 agent，用 `Agent` 工具就够了。但当你需要**确定性控制流**（循环、条件、并行扇出），Workflow 就是正确选择。

## 最简 Workflow

```javascript
export const meta = {
  name: 'hello-workflow',
  description: '最简单的 workflow 示例',
  phases: [
    { title: 'Greet' },
  ],
}

phase('Greet')
const result = await agent('说一声你好，然后用一句话总结什么是 workflow')
log(`结果: ${result}`)
```

三要素：
1. **`meta`** — 声明名称、描述、阶段（纯字面量，不能用变量）
2. **`phase()`** — 标记当前阶段，影响 UI 进度显示
3. **`agent()`** — 启动一个子 agent，返回它的最终文本

## 稍复杂一点：两阶段 pipeline

```javascript
export const meta = {
  name: 'scan-and-fix',
  description: '扫描代码问题然后修复',
  phases: [
    { title: 'Scan' },
    { title: 'Fix' },
  ],
}

phase('Scan')
const problems = await agent('列出这段代码的 3 个问题', {
  schema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            file: { type: 'string' },
          },
          required: ['title', 'file'],
        },
      },
    },
    required: ['issues'],
  },
})

phase('Fix')
for (const issue of problems.issues) {
  await agent(`修复这个问题: ${issue.title}，在文件 ${issue.file} 中`)
  log(`已修复: ${issue.title}`)
}
```

新概念：
- **`schema`** — 给 agent 指定 JSON Schema，强制它返回结构化数据（而不是自由文本）
- **for 循环** — 脚本里可以正常用 JS 控制流

## 核心概念速查

| 概念 | 一句话 | 详见 |
|------|--------|------|
| `meta` | 声明式元数据，必须纯字面量 | [02-core-api.md](02-core-api.md) |
| `phase()` | 标记进度阶段，仅影响展示 | [02-core-api.md](02-core-api.md) |
| `agent()` | 启动子 agent，返回结果 | [02-core-api.md](02-core-api.md) |
| `log()` | 输出进度消息给用户 | [02-core-api.md](02-core-api.md) |
| `pipeline()` | 流水线并行——各 item 独立走完全部阶段 | [03-flow-control.md](03-flow-control.md) |
| `parallel()` | 屏障并行——等所有任务完成才继续 | [03-flow-control.md](03-flow-control.md) |
| `args` | 用户传入的参数 | [02-core-api.md](02-core-api.md) |
| `budget` | token 预算控制 | [05-budget-and-scale.md](05-budget-and-scale.md) |

## 注意事项（新手必读）

1. **脚本是普通 JavaScript**，不是 TypeScript —— 类型注解、interface、泛型会解析失败
2. **`Date.now()`、`Math.random()`、无参 `new Date()` 不可用** —— 它们会破坏缓存/恢复机制
3. **`meta` 必须是纯字面量** —— 不能用变量、函数调用、展开运算符、模板插值
4. **`agent()` 返回的是原始数据** —— agent 被告知它的最终文本就是返回值，不是给人读的消息
5. **schema 参数做校验** —— 在工具调用层验证，agent 不匹配会自动重试
