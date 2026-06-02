# 04 - Quality Patterns：确保结果可靠的模式

这些模式解决一个核心问题：**单个 agent 的输出可能不可靠，怎么交叉验证？**

---

## 1. Adversarial Verify（对抗验证）

**问题：** agent 找到的 bug / 安全问题可能是假阳性——听起来合理但实际不成立。

**解法：** 对每个发现，派 N 个独立的"怀疑者"agent，让它们**主动反驳**。多数反驳掉 → 丢弃。

```javascript
const claim = "file.ts:42 存在 SQL 注入漏洞"

const votes = await parallel(
  Array.from({ length: 3 }, () => () =>
    agent(
      `尝试反驳以下发现。如果你不确定，默认反驳=true。\n发现: ${claim}`,
      { schema: VERDICT_SCHEMA }
    )
  )
)

const survives = votes
  .filter(Boolean)
  .filter(v => !v.refuted)
  .length >= 2  // 3 个中至少 2 个认为不可反驳 → 保留

if (survives) {
  confirmed.push(claim)
}
```

**关键参数：**
- 投票人数：通常 3（≥2 通过）或 5（≥3 通过）
- prompt 技巧：明确告诉 agent "默认反驳"，偏向过滤而非保留

---

## 2. Perspective-Diverse Verify（多角度验证）

**问题：** 一个发现可能从多个维度失效（正确性、安全性、性能、可复现性），同质化验证会遗漏。

**解法：** 给每个验证者不同的"透镜"。

```javascript
const LENSES = ['correctness', 'security', 'performance', 'reproducibility']

const verdicts = await parallel(
  LENSES.map(lens => () =>
    agent(`从 ${lens} 角度验证此发现是否真实: ${finding}`, {
      schema: VERDICT_SCHEMA,
    })
  )
)

const confirmed = verdicts
  .filter(Boolean)
  .filter(v => v.isReal)
  .length >= 2  // 至少 2 个角度确认
```

**vs Adversarial Verify：**
- 对抗验证 = N 个怀疑者用相同视角反驳
- 多角度验证 = N 个专家用不同维度审查
- 可以组合使用：多角度验证 → 通过的 → 再对抗验证

---

## 3. Judge Panel（评审团）

**问题：** 方案空间大，一次尝试很难找到最优解。

**解法：** 独立生成 N 个方案，用评委打分，从胜出方案综合，并嫁接亚军的优点。

```javascript
const APPROACHES = [
  { key: 'mvp', prompt: '从 MVP 角度设计方案，优先最小可行实现' },
  { key: 'risk', prompt: '从风险控制角度设计方案，优先安全和稳定性' },
  { key: 'user', prompt: '从用户体验角度设计方案，优先易用性' },
]

// 阶段 1: 并行生成方案
const proposals = await parallel(
  APPROACHES.map(a => () =>
    agent(a.prompt, { label: `propose:${a.key}`, schema: PROPOSAL_SCHEMA })
  )
)

// 阶段 2: 评委打分
const scored = await parallel(
  proposals.filter(Boolean).map(p => () =>
    agent(`为以下方案打分（1-10）：${JSON.stringify(p)}`, {
      schema: SCORE_SCHEMA,
    })
  )
)

// 阶段 3: 综合胜出方案 + 嫁接优点
const winner = proposals.filter(Boolean)[findBestIndex(scored)]
const synthesis = await agent(
  `基于胜出方案合成最终方案:\n胜出: ${JSON.stringify(winner)}\n` +
  `其他方案中值得嫁接的想法: ${extractGoodIdeas(proposals, scored)}`,
  { schema: FINAL_PROPOSAL_SCHEMA }
)
```

---

## 4. Loop-Until-Dry（循环直到枯竭）

**问题：** 不知道有多少问题/bug/边界情况，简单计数器（while count < N）会遗漏尾部。

**解法：** 反复搜索，连续 K 轮无新发现才停止。

```javascript
const seen = new Set()
const confirmed = []
let dry = 0

while (dry < 2) {  // 连续 2 轮无新发现 → 停
  const found = (await parallel(
    FINDERS.map(f => () =>
      agent(f.prompt, { phase: 'Find', schema: BUGS_SCHEMA })
    )
  )).filter(Boolean).flatMap(r => r.bugs)

  const fresh = found.filter(b => !seen.has(key(b)))

  if (!fresh.length) {
    dry++
    continue
  }

  dry = 0
  fresh.forEach(b => seen.add(key(b)))

  // 验证新发现
  const verified = await parallel(
    fresh.map(b => () =>
      agent(`验证: ${b.desc}`, { phase: 'Verify', schema: VERDICT_SCHEMA })
    )
  )

  confirmed.push(...verified.filter(Boolean).filter(v => v.isReal))
}
```

**关键：** 去重用 `seen`（所有见过的），不是 `confirmed`（验证通过的）。否则被拒绝的发现下一轮又会冒出来，永不收敛。

---

## 5. Multi-Modal Sweep（多模态扫描）

**问题：** 单一搜索角度无法覆盖所有内容。

**解法：** 并行派出多个 agent，每个用不同的搜索策略。

```javascript
const ANGLES = [
  { key: 'by-container', prompt: '按模块/容器分组搜索' },
  { key: 'by-content', prompt: '按内容类型（字符串、数字、日期）搜索' },
  { key: 'by-entity', prompt: '按实体类型（用户、订单、产品）搜索' },
  { key: 'by-time', prompt: '按时间线/变更历史搜索' },
]

const allFindings = await parallel(
  ANGLES.map(a => () =>
    agent(a.prompt, { label: `sweep:${a.key}`, schema: FINDINGS_SCHEMA })
  )
)

// 合并去重
const merged = deduplicate(allFindings.filter(Boolean).flatMap(r => r.items))
```

---

## 6. Completeness Critic（完整性批评者）

**问题：** 工作完成后可能有遗漏——某个模态没跑、某个声明没验证、某个来源没读。

**解法：** 最后派一个 agent 专门问"还缺什么"。

```javascript
// ... 主工作流完成后 ...

const gaps = await agent(
  `回顾以下已完成的工作，指出遗漏:\n` +
  `已执行的模态: ${doneModalities.join(', ')}\n` +
  `已验证的声明: ${verifiedClaims.join(', ')}\n` +
  `已读取的来源: ${readSources.join(', ')}\n` +
  `还缺什么？`,
  { schema: GAPS_SCHEMA }
)

if (gaps.missing.length > 0) {
  // 把 gaps.missing 转化为新的任务继续执行
}
```

---

## 模式选择指南

| 你的场景 | 推荐模式 |
|----------|----------|
| 过滤假阳性 | Adversarial Verify |
| 单一维度验证不够 | Perspective-Diverse Verify |
| 需要从多个方案中选最优 | Judge Panel |
| 不知道总量，要穷尽 | Loop-Until-Dry |
| 搜索覆盖面不够 | Multi-Modal Sweep |
| 担心有遗漏 | Completeness Critic |
| 简单查找 | 单个 agent 即可，不需要这些 |

**组合示例：** 审计代码库
1. Multi-Modal Sweep（多角度搜索 bug）
2. 去重
3. Adversarial Verify（3 人反驳验证）
4. Completeness Critic（还漏了什么？）
5. Loop-Until-Dry（回到第 1 步直到无新发现）
