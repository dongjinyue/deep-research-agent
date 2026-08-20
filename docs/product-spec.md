# Deep Research Agent + Evaluation Lab

> 状态：Draft 0.3
>
> 当前阶段：用单一前端固定 Mock Research Plan 验证规格、展示和串行步骤状态流转。
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
planning（正在生成 Plan，尚无 Plan）
       ↓ 1 秒后 Mock Plan 生成成功
researching（Plan 已生成，第一个 Step 为 running）
       ↓ Steps 串行完成
generating → completed
```

- 页面尚未创建 Task 时显示 `idle`。
- 用户提交有效问题后只创建本地 Mock Task，并进入 `planning`；此时 Plan 尚未生成。
- 1 秒后 Mock Plan 生成成功，Task 获得唯一 Plan 并进入 `researching`，第一个 Step 同时进入 `running`。
- 全部 Research Steps 串行执行完成后，Task 进入 `generating`。
- `generating` 持续 1 秒后，Task 进入 `completed`。
- 状态推进不调用 LLM、搜索 API、数据库或后端服务。
- Task 只能按已声明的合法路径转换；`completed`、`failed` 和 `cancelled` 是终态。
- Task 进入 `failed` 时必须携带包含 `code`、`message` 和 `retryable` 的结构化错误；页面展示错误信息、错误代码和是否可重试。

仅在本地开发和自动化测试环境中，可在输入中使用 `[mock:failed]`、`[mock:cancelled]` 模拟 `planning` 期间进入终态；生产构建不识别这些标记。它们不是正式用户输入协议或未来 API 契约，创建 Task 前会从 `question` 中移除；移除标记后问题为空时不能创建 Task。两个标记同时出现时，仅为保持测试确定性而让 `failed` 优先。模拟失败或取消时不会生成 Plan，也不会注册自动推进定时器。

| Research Task 状态 | 中文含义 |
| --- | --- |
| `planning` | 正在制定计划 |
| `researching` | 正在研究 |
| `generating` | 正在生成报告 |
| `completed` | 已完成 |
| `failed` | 失败 |
| `cancelled` | 已取消 |

## Research Plan

### 1. 目标

- 让用户在研究开始前看到系统准备执行的研究步骤。
- 通过一个前端固定 Mock 模板验证 Research Plan 与 Research Step 的展示和状态变化。
- 验证 Research Task 状态与 Research Step 状态属于两个独立的状态生命周期。

### 2. 触发条件与前置条件

- 用户提交去除首尾空白后仍非空的 Research Question 时，系统创建 Research Task。
- 创建 Task 后先进入 `planning`，此时 Plan 尚不存在。
- Mock Plan 在 1 秒后生成成功；Task 获得一个且仅一个 Plan，并立即进入 `researching`。
- `planning` 可以合法进入 `failed` 或 `cancelled`；这两条路径不生成 Plan。

### 3. 输入、输出与领域模型

- 输入：Task 的 `id` 与规范化后的 `question`。
- 输出：一个 `taskId` 与 Task `id` 一致、包含 3 个 Steps 的 Research Plan。
- 每个 Step 必须有非空 `id`、`title`、`description` 和独立的 `status`。

```ts
export interface ResearchPlan {
  id: string
  taskId: string
  steps: ResearchStep[]
}

export interface ResearchStep {
  id: string
  title: string
  description: string
  status: ResearchStepStatus
}

export type ResearchStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
```

Research Task 在 `planning` 成功结束后持有唯一 Plan：

```ts
plan?: ResearchPlan
```

`planning` Task 没有 Plan；`researching`、`generating` 和 `completed` Task 必须有 Plan。Research Step 使用独立的 `ResearchStepStatus`，不得复用 `ResearchTaskStatus`。

### 4. 业务规则

- 系统只提供一套包含 3 个 Steps 的固定 Mock 模板，满足 3–6 个 Steps 的范围约束。
- 模板第一步的描述包含用户提交的 Research Question，便于验证 Plan 与 Task 的关联。
- 每个 Task 都创建新的 Plan `id` 和新的 Step `id`。
- Plan 创建时所有 Steps 均为 `pending`。
- Research Steps 按顺序串行执行，同一时刻最多只有一个 Step 处于 `running`。
- Step 只能按 `pending → running → completed` 推进；当前切片没有 Step 级失败或跳过状态。
- 本功能只使用前端本地 Mock，不调用 LLM、搜索 API、数据库或后端服务。

固定 Mock 模板也是产品规格的一部分，不能只隐藏在实现中：

| 顺序 | title | description |
| --- | --- | --- |
| 1 | 明确研究范围 | 围绕用户问题确认关键概念、比较维度和研究边界。 |
| 2 | 收集并核验资料 | 按研究维度收集资料，并交叉核验关键信息。 |
| 3 | 整理结论与引用 | 基于已核验资料整理结论和可追溯引用。 |

### 5. 状态变化

正常成功路径如下：

```text
创建 Task
        ↓
Task: planning
Plan: 尚未生成
        ↓ 1 秒后 Mock Plan 生成成功
Task: researching
Steps: running, pending, ...
        ↓ 每隔 1 秒完成当前 Step，并启动下一 Step
Steps: completed, running, ...
        ↓ 全部 Steps 完成
Task: generating
        ↓ 1 秒
Task: completed
```

Research Step 状态含义：

| Research Step 状态 | 中文含义 |
| --- | --- |
| `pending` | 等待执行 |
| `running` | 执行中 |
| `completed` | 已完成 |

Task 级 `failed` 和 `cancelled` 继续遵循既有合法转换表。当前本地终态标记模拟 `planning` 期间失败或取消，因此终态 Task 没有 Plan，Steps 也不会开始执行。

### 6. 验收标准

- 创建有效 Research Task 后初始状态为 `planning`，此时不展示尚未生成的 Plan。
- 1 秒后 Mock Plan 生成成功，Plan `taskId` 与 Task `id` 一致；Task 自动进入 `researching`，第一个 Step 同时进入 `running`。
- Plan 包含 3 个具有完整字段和唯一 Step `id` 的 Steps；创建时均为 `pending`，进入 `researching` 时只有第一步变为 `running`。
- 每隔 1 秒，当前 Step 进入 `completed`，下一个 Step 进入 `running`。
- 全部 Steps 完成后，Task 进入 `generating`，1 秒后进入 `completed`。
- 任一时刻最多只有一个 Step 为 `running`。
- `[mock:failed]` 和 `[mock:cancelled]` 可让 Task 在 `planning` 期间进入对应终态；不生成 Plan，也不会继续自动推进。
- 自动化测试使用 fake timers 验证状态推进，不进行真实时间等待。
- 页面展示必要的 Step 标题、描述和离散状态，不展示百分比或其他虚假精确进度。
- 页面明确说明当前 Plan 来自前端固定 Mock，不暗示已经执行真实搜索或研究。

### 7. 当前版本不做什么（Non-goals）

- 不调用 LLM 动态生成 Plan，不连接真实 AI、搜索或后端接口。
- 不持久化 Task 或 Plan；页面刷新后数据可以丢失。
- 不实现多个 Research Tasks 的列表或跨 Task 历史管理。
- 不实现 Plan 重新生成、历史版本、切换、确认或重新规划。
- 不实现 Plan 或 Step 的人工编辑、拖拽排序和增删步骤。
- 不实现并行步骤、动态追加步骤、暂停、重试或 Step 级 `failed` / `skipped` 传播规则。
- 不展示 `progress` 百分比、预计耗时或其他没有真实数据支持的精确指标。

## Research Step Execution

### 目标

在 Mock 研究过程中，让用户看到 Research Steps 依次执行。

### 规则

1. 同一时间最多一个 Research Step 处于 `running`。
2. 当前 Step 完成后，下一个 `pending` Step 进入 `running`。
3. 所有 Steps 完成后，Research Task 从 `researching` 进入 `generating`。
4. 当前版本只模拟顺序执行。
5. Research Task 进入 `cancelled` 或 `failed` 后，不再继续执行 Steps。
6. 仅在本地开发和自动化测试环境中，可使用 `[mock:research-failed]` 和 `[mock:research-cancelled]` 模拟执行期终态；Task 刚进入 `researching`、第一个 Step 刚进入 `running` 时立即触发。
7. 执行期终止后保留 Plan，并冻结已有 Step 状态；当前 `running` Step 和剩余 `pending` Steps 不再变化。

多个本地 Mock 标记同时出现时，按以下顺序确定唯一结果：

```text
[mock:failed]
→ [mock:cancelled]
→ [mock:research-failed]
→ [mock:research-cancelled]
```

planning 阶段终态优先于执行期终态，同一阶段始终由 `failed` 优先。所有标记都必须在创建 Task 前从真实 `question` 中移除；生产构建不识别这些标记。

### 状态变化

正常执行路径：

```text
Task: researching
Steps: running, pending, pending
        ↓ 当前 Step 完成，下一 Step 启动
Steps: completed, running, pending
        ↓ 按顺序继续
Steps: completed, completed, running
        ↓ 最后一个 Step 完成
Steps: completed, completed, completed
Task: generating
```

执行期终止路径：

```text
Task: researching + Plan 保留
        ↓ failed 或 cancelled
Task: failed / cancelled
Steps: 冻结，不再变化
后续自动推进计时器：不再注册
```

### 非目标

- 不执行真实搜索。
- 不并行执行 Steps。
- 不提供 Step Retry（步骤重试）。
- 不进行重新规划。
- 不提供暂停功能。
- 不动态追加 Step。

### 验收标准

- [ ] 同一时间最多一个 Step 处于 `running`。
- [ ] Steps 按顺序执行。
- [ ] 已完成的 Step 进入 `completed`。
- [ ] 最后一个 Step 完成后，Research Task 进入 `generating`。
- [ ] Research Task 进入 `cancelled` 后不再继续执行 Steps。
- [ ] Research Task 进入 `failed` 后不再继续执行 Steps。
- [ ] `[mock:research-cancelled]` 在第一个 Step 进入 `running` 后立即将 Task 切换为 `cancelled`，Plan 与 Step 状态保持不变。
- [ ] `[mock:research-failed]` 在第一个 Step 进入 `running` 后立即将 Task 切换为 `failed`，Plan 与 Step 状态保持不变，并携带结构化错误。
- [ ] 执行期终态触发后不再注册后续自动推进计时器。

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
├── plan?: ResearchPlan（planning 成功结束后存在）
├── sources: Source[]
├── evidence: Evidence[]
└── report?: Report

ResearchPlan
├── id
├── taskId
└── steps: ResearchStep[]

ResearchStep
├── id
├── title
├── description
└── status: ResearchStepStatus

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
