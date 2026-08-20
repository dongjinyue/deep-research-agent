# 领域建模（Domain Modeling，领域建模）

## 一句话理解

领域建模不是把接口字段列全，而是用业务语言表达：

> 系统里有哪些业务对象、它们各自负责什么、哪些状态成立、什么变化合法。

对 Deep Research Agent 来说，核心不是 Vue 组件、按钮或 API，而是：

```text
Research Question
      ↓
ResearchTask
      ↓
ResearchPlan
      ↓
ResearchStep
```

当前阶段只建模已经存在且可验证的本地 Mock 研究流程。

## Domain：领域

Domain（领域）是软件要解决的业务问题空间。

Deep Research Agent 当前领域关注：

- 用户提出什么研究问题；
- 一次 Research Task 处于哪个生命周期阶段；
- Research Plan 如何描述研究路径；
- Research Steps 如何按顺序推进；
- 失败、取消和完成分别意味着什么。

以下属于技术实现，不是核心领域概念：

- Vue `ref`、computed 和组件生命周期；
- 定时器、测试标记和 fake timers；
- CSS class、按钮禁用状态和中文展示标签；
- 未来的模型 SDK、HTTP 请求和数据库序列化。

## 数据结构 vs 领域模型

数据结构只回答：

> 有哪些字段？

领域模型还要回答：

> 这些字段代表什么业务事实？什么变化被允许？谁负责执行变化？

```text
数据结构 = 信息

领域模型 = 信息 + 规则 + 行为
```

例如，只有下面的字段还不够：

```ts
interface ResearchTask {
  id: string
  status: string
}
```

Deep Research Agent 当前还明确了：

- `idle` 表示页面没有 Task，不是 ResearchTask 状态；
- `planning` 时尚无 Plan；
- `researching`、`generating`、`completed` 必须有 Plan；
- 进入 `failed` 必须携带结构化错误；
- `completed`、`failed`、`cancelled` 都是不可继续推进的终态；
- Task 只能沿合法状态路径转换；
- Step 只能按 `pending → running → completed` 推进；
- 同一时刻最多一个 Step 为 `running`。

这些规则与执行规则的函数共同组成领域模型。领域行为不一定要写成 class 方法；纯函数同样可以承载领域行为。

## 当前项目的核心模型

### ResearchTask

ResearchTask 代表一次完整研究任务，是当前模型的业务入口。

它负责表达：

- 稳定身份；
- 规范化后的 Research Question；
- 当前生命周期状态；
- 创建时间；
- planning 成功后的唯一 Research Plan；
- failed 状态下的结构化错误。

当前合法路径：

```text
planning → researching → generating → completed
    │            │              │
    ├────────────┴──────────────┼→ failed
    └───────────────────────────┴→ cancelled
```

`failed`、`cancelled`、`completed` 关闭生命周期，不能恢复或继续执行。

### ResearchPlan

ResearchPlan 描述一次 Task 准备执行的研究路径。

它负责：

- 通过 `taskId` 归属于唯一 Task；
- 按顺序包含多个 Research Steps；
- 表达研究如何被拆解，而不是亲自调用模型或搜索工具。

当前固定 Mock Plan 有 3 个 Steps。固定模板是已确认产品规格，不是假装由真实 Planner 动态生成的研究结果。

### ResearchStep

ResearchStep 代表研究路径中的一个可观察业务动作。

它负责表达：

- Step 的稳定身份；
- 面向业务的标题和目标描述；
- 离散执行状态。

它不负责：

- 注册或清理定时器；
- 调用 LLM、搜索或网页工具；
- 解析本地 Mock 标记；
- 更新页面；
- 决定整个 Task 的运行协调方式。

因此当前 ResearchStep 没有承担不应承担的执行基础设施职责。

## Entity：实体

Entity（实体）由稳定身份和连续生命周期区分，不只由字段值区分。

当前项目中的实体：

- `ResearchTask`：由 Task `id` 区分，状态会随生命周期变化；
- `ResearchPlan`：有独立 `id`，并归属于一个 Task；
- `ResearchStep`：有独立 `id`，状态会在执行过程中变化。

即使两个 Steps 的标题和描述相同，只要 `id` 不同，它们仍是不同实体。

## Value Object：值对象

Value Object（值对象）由值本身定义，通常没有独立身份。

当前可以把 `ResearchTaskError` 视为值对象：

```text
code + message + retryable
```

它描述一次失败的业务可观察信息，不需要独立 `id`。

Research Question 未来也可能被封装为值对象，用来集中非空、长度或规范化规则；当前只有简单去空白规则，没有必要提前增加 class 或文件。

## Service：服务

Service（服务）承载跨对象或不适合归属于单一实体的用例协调。

当前 `ResearchTaskService` 负责：

- 判断输入是否可以启动；
- 启动一次 Research Run；
- 新运行开始时停止旧运行；
- 忽略旧运行迟到的状态事件；
- 页面销毁时释放运行资源。

`MockResearchRunner` 负责本地 Mock 执行方式：

- 解析仅开发和测试环境使用的 Mock 标记；
- 创建 Mock Task；
- 用定时器推进 Mock 生命周期；
- 在终态停止继续推进。

两者都不是“万能 Manager”。名称直接说明业务对象和职责。

## 领域边界

当前领域边界内：

- ResearchTask、ResearchPlan、ResearchStep、ResearchTaskError；
- Task 合法状态转换；
- Plan 归属和存在条件；
- Step 串行执行不变量；
- 终态关闭规则。

当前领域边界外：

- Vue 页面渲染；
- Timer 和 Mock 控制标记；
- LLM、搜索、网页读取和内容提取；
- 数据库、网络重试和持久化；
- Prompt、模型配置、Token 与成本记录。

未来的 Source、Evidence、Report 和 Memory 只有在出现真实业务事实与明确规则后再进入模型。现在创建空字段或假数据会制造虚假的领域完整性。

## UI 与业务分离

当前职责关系：

```text
App.vue
  ├─ 收集输入
  ├─ 展示 Task / Plan / Steps
  └─ 启动和释放页面用例
          ↓
ResearchTaskService
  └─ 协调一次运行及其生命周期资源
          ↓
MockResearchRunner
  └─ 执行本地 Mock 推进
          ↓
research-task.ts
  └─ 领域类型、合法转换和不变量
```

判断边界的关键问题：

- 如果换成命令行界面，规则是否仍成立？成立的通常属于领域层。
- 如果把 Timer 换成真实 Agent，业务对象是否仍保留？应保留的属于领域模型。
- 如果只改变中文文案，是否会改变业务规则？不会的属于展示层。

## 命名即上下文

命名不是代码表面整理，而是在给 AI 和开发者提供业务上下文。

优先使用业务语言：

- `ResearchTask`，而不是 `TaskData`；
- `ResearchPlan`，而不是 `PlanInfo`；
- `ResearchStep`，而不是 `Item`；
- `transitionResearchTask`，而不是 `handleStatus`；
- `MockResearchRunner`，而不是 `TaskManager`。

谨慎使用缺少业务含义的后缀：

```text
Data
Manager
Handler
Helper
Utils
```

这些名称并非永远禁止，但必须能回答“它具体管理、处理或帮助什么业务职责”。

## 业务语言优先

代码、Product Spec、测试和领域地图应尽量使用同一套 Ubiquitous Language（通用语言）：

```text
Research Question
ResearchTask
ResearchPlan
ResearchStep
planning / researching / generating
failed / cancelled / completed
```

同一概念如果在页面叫“研究任务”、代码叫 `Job`、文档叫 `Request`，AI 很容易生成重复模型或错误转换。

状态和规则发生变化时，应同步检查：

```text
Product Spec → 领域代码 → 测试 → domain-model.md → UI 文案
```

## 避免过度 DDD

DDD（Domain-Driven Design，领域驱动设计）提供建模思路，不要求当前项目复制完整战术模式。

Day 8 不需要：

- 为每个字段创建 class；
- 引入 Repository、Factory、Aggregate Root 基类；
- 建立复杂目录和多层接口；
- 接入后端、数据库或事件总线；
- 实现真实 LLM、RAG、多 Agent 或工具编排；
- 为未来 Source、Evidence、Report 提前填充假对象；
- 只为“架构漂亮”拆分稳定且很小的文件。

当前最合适的做法是：用 TypeScript 类型表达状态形状，用少量纯函数执行规则，用服务与 Runner 隔离 UI 和执行细节。

## Deep Research Agent 当前审查结论

- 核心概念清晰：Task 表达生命周期，Plan 表达研究路径，Step 表达单个研究动作。
- 不属于“接口字段冒充领域模型”：状态转换、Plan 条件、结构化错误、Step 串行不变量均有代码和测试支撑。
- ResearchTask 状态规则与 Product Spec 一致，终态关闭。
- ResearchStep 没有承担 Timer、工具调用、页面更新或 Task 运行协调。
- App.vue 已主要保留 UI 和页面级状态，不再直接实现 Mock 生命周期。
- 现有 `Service` 与 `Runner` 名称有明确业务含义，没有模糊的 Data、Manager 或 Handler 对象。
- 没有新增后端、数据库、RAG、真实 LLM、多 Agent 或完整 DDD 框架。
- `docs/domain-model.md` 已承担当前领域地图职责。

保留的轻量技术债：`research-task.ts` 仍同时包含通用领域规则与部分 Mock 工厂/推进函数。当前规模下保持共置比提前拆分更清晰，真实 Runner 或第二种执行实现出现时再评估。

## 领域模型设计检查清单

### 概念与语言

- [ ] 名称来自业务，而不是来自页面或数据库结构。
- [ ] 同一概念在 Spec、代码、测试和 UI 中含义一致。
- [ ] 每个核心对象能用一句话说明职责。
- [ ] 没有 `Data`、`Manager`、`Handler` 等无法说明边界的命名。

### 数据与规则

- [ ] 模型不仅有字段，还明确合法状态和变化规则。
- [ ] 非法状态尽量通过类型或转换函数被阻止。
- [ ] 终态、必填关联和错误结构有明确约束。
- [ ] Task 与 Step 没有复用同一状态类型。
- [ ] 测试覆盖正常路径、失败路径和不变量。

### 职责与边界

- [ ] Entity 只负责自身业务身份和生命周期。
- [ ] Value Object 不被强行赋予虚假身份。
- [ ] Service 只协调跨对象用例，不变成万能入口。
- [ ] UI 不直接改写领域状态或维护另一份转换表。
- [ ] Timer、网络、数据库和 Provider SDK 不进入领域模型。

### 演进与克制

- [ ] 只建模当前存在且可验证的业务事实。
- [ ] 新状态先确认传播、恢复和用户可观察行为。
- [ ] 没有为未来能力增加空层、空接口或假数据。
- [ ] 没有为了完整 DDD 而增加依赖或目录复杂度。
- [ ] 真实 Agent 接入时替换执行方式，而不是推翻稳定领域语言。

## 1 分钟复习

```text
Domain = 软件解决的业务问题空间

数据结构 = 信息
领域模型 = 信息 + 规则 + 行为

Entity = 由稳定身份和生命周期区分
Value Object = 由值本身定义
Service = 协调不属于单一实体的业务用例

Deep Research Agent：
ResearchTask 管生命周期
ResearchPlan 管研究路径
ResearchStep 表达单个研究动作与状态

UI 负责输入与展示
Service 负责用例协调
Runner 负责执行方式
领域层负责合法状态与不变量

命名即上下文，优先使用业务语言
先建模真实事实，避免过度 DDD
```
