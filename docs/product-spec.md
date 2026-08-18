# Deep Research Agent + Evaluation Lab

> 状态：Draft 0.2
>
> 当前阶段：在 Day 1 输入切片之上，增加 Research Task 本地 Mock 状态生命周期。
>
> 原则：先验证单一研究流程，再引入 Multi-Agent、登录内容、Evaluation Lab 等高不确定性能力。

## Problem

知识工作者需要围绕工作问题完成资料搜索、阅读、核验和整理。普通搜索很容易得到零散信息，但难以直接形成一份结论有证据、引用可追溯、能够辅助决策的研究报告。

本产品希望把研究过程拆成可观察、可验证的步骤，并最终生成带引用的报告。

## Target User

### MVP 用户：普通知识工作者

- 有明确的工作研究问题。
- 希望了解研究计划和执行状态，而不是只看到一段即时回答。
- 需要结论能够追溯到真实来源。

### 后续用户：Research Agent AI 工程师

- 希望用固定题集比较模型、Prompt 和 Agent 配置。
- 该用户对应 Evaluation Lab，不属于当前 MVP 的实现范围。

## Core User Flow

1. 用户输入 Research Question。
2. 系统创建 Research Task。
3. 系统生成并展示 Research Plan。
4. 系统依次执行多个 Research Steps。
5. 系统展示找到的 Sources。
6. 系统展示由来源支持的 Evidence。
7. 系统生成 Final Report。
8. 报告展示可追溯的 Citations。

## Day 1 Delivery Scope

Day 1 只实现上述流程的第一小块：

1. 展示基础页面 Layout。
2. 用户能够输入 Research Question。
3. 空问题不能提交。
4. 提交后在前端创建并展示一个 Mock Research Task。

Day 1 不调用 LLM、搜索 API 或后端服务，也不伪装已经完成真实研究。

## Research Task Lifecycle Slice

当前切片只通过前端本地 Mock 验证 Research Task 的正常成功路径。页面没有 Task 时显示 `idle`，但 `idle` 不是 Research Task 状态：

```text
无 Task（页面 idle）
       ↓ 创建 Task
planning → researching → generating → completed
```

- 页面尚未创建 Task 时显示 `idle`。
- 用户提交有效问题后创建本地 Mock Task，并进入 `planning`。
- 前端 Mock 每隔 1 秒自动推进到下一个正常状态。
- 状态推进不调用 LLM、搜索 API、数据库或后端服务。
- Task 只能按已声明的合法路径转换；`completed`、`failed` 和 `cancelled` 是终态。
- Task 进入 `failed` 时必须携带包含 `code`、`message` 和 `retryable` 的结构化错误。

本地开发和自动化测试可在输入中使用 `[mock:failed]`、`[mock:cancelled]` 模拟终态。它们不是正式用户输入协议或未来 API 契约，创建 Task 前会从 `question` 中移除；两个标记同时出现时仅为保持测试确定性而让 `failed` 优先。

| Research Task 状态 | 中文含义 |
| --- | --- |
| `planning` | 正在制定计划 |
| `researching` | 正在研究 |
| `generating` | 正在生成报告 |
| `completed` | 已完成 |
| `failed` | 失败 |
| `cancelled` | 已取消 |

## MVP Features

- Research Question 输入与基础校验。
- Research Task 创建和状态展示。
- Research Plan 展示。
- Research Steps 状态展示。
- Source List。
- Evidence List，并能关联对应 Source。
- Final Report 与 Citations 展示。

这些功能会在后续 Day 中逐步实现，不要求 Day 1 一次完成。

## Domain Model

```text
ResearchTask
├── id
├── question
├── status
├── createdAt
├── plan: ResearchStep[]
├── sources: Source[]
├── evidence: Evidence[]
└── report?: Report

ResearchStep
├── id
├── question
├── status（使用独立的 ResearchStepStatus，不复用 ResearchTaskStatus）
└── result?

Source
├── id
├── url
├── title
└── content

Evidence
├── id
├── claim
├── sourceId
└── quote

Report
├── summary
├── sections[]
└── citations[]
```

模型允许后续演化；Day 1 不追求一次设计出“最终架构”。

## Non-goals

当前 MVP 明确不包含：

- 登录、支付、团队、权限与组织管理。
- 复杂编辑器、实时协作、分享和社交功能。
- Mobile App 和多语言。
- 复杂知识库、RAG 与用户文件上传。
- 读取需要登录或复用浏览器会话的内容。
- 自定义 Multi-Agent 编排器。
- Evaluation Lab 的运行平台和 Dashboard。
- 定时研究、持续监控和主动通知。

## Constraints

- Web 前端使用 Vue 3 + TypeScript。
- Day 1 不新增 UI Library。
- Day 1 只使用前端本地状态，不定义虚假的后端 API。
- 报告中的引用必须能回溯到系统实际读取的 Source。
- Evidence 必须引用明确的 `sourceId`。
- 证据不足时必须明确表达不确定性，不能把推测包装成事实。
- 每次只实现可以独立验证的小步骤，控制 Change Surface。

## Success Criteria

### Day 1

- 页面能够在本地运行并完成生产构建。
- 用户能够输入非空研究问题并创建 Mock Research Task。
- 空输入无法创建任务。
- 自动化测试覆盖基础渲染、空输入校验和成功提交。
- 没有接入 LLM、搜索、数据库或其他超出 Day 1 的能力。

### Deep Research Agent MVP

- 用户能从一个问题创建 Research Task，并看到计划和步骤状态。
- 最终报告中的关键结论都有 Citation。
- Citation 能定位到实际读取的 Source。
- 来源冲突或证据不足时，报告会明确提示，而不是强行给出确定答案。

## Future Scope

以下内容只有在单一研究流程经过测试和 Eval 后才考虑：

- 需求澄清对话。
- 多 Agent 搜索、阅读与交叉验证。
- 用户上传文件、指定 URL 和登录内容的安全读取。
- Evaluation Lab：Dataset、批量运行、Evaluator、成本／延迟／质量对比。
- 导出、分享、团队协作与权限。
