# Workflow 工具教程：从入门到精通

本教程面向 agent，系统讲解如何使用 **Workflow** 工具编写确定性编排脚本。

## 教程结构

按顺序阅读，每篇建立在前一篇的基础上：

| 编号 | 文件 | 内容 | 适合谁 |
|------|------|------|--------|
| 01 | [quick-start.md](01-quick-start.md) | Workflow 是什么、最简示例、核心概念 | 完全没接触过 |
| 02 | [core-api.md](02-core-api.md) | meta 定义、agent()、phase()、log() 详解 | 知道基本概念 |
| 03 | [flow-control.md](03-flow-control.md) | pipeline() vs parallel()、何时用哪个 | 能写基本 workflow |
| 04 | [quality-patterns.md](04-quality-patterns.md) | adversarial verify、judge panel、loop-until-dry 等 | 能编排多阶段流程 |
| 05 | [budget-and-scale.md](05-budget-and-scale.md) | 预算管理、并发控制、缓存与恢复 | 需要处理大规模任务 |
| 06 | [recipes.md](06-recipes.md) | 组合模式、真实案例、常见陷阱 | 想写生产级 workflow |

## 一句话总结

Workflow = 用 JavaScript 脚本把多个 agent 调用编排成**确定性**流程——你有完整的控制权，模型只负责每个 agent 内部的推理。
