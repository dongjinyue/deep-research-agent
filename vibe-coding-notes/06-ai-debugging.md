# AI 调试（AI-assisted Debugging）

## 一句话理解

AI-assisted Debugging（AI 辅助调试）不是让 AI 连续猜修复方案，而是让它根据可重复的运行证据逐步缩小问题范围，直到定位 Root Cause（根因），再做最小修复并留下回归证据。

```text
复现 → 观察 → 提出假设 → 证伪假设 → 定位根因 → 最小修复 → 回归验证
```

调试的核心产物不是“改过的代码”，而是：

1. 可稳定复现的问题；
2. 能解释问题的根因；
3. 与根因对应的最小修复；
4. 能防止复发的验证证据。

## Symptom、Bug 与 Root Cause

Symptom（症状）、Bug（缺陷）和 Root Cause（根因）是三个层次。

| 层次 | 含义 | Deep Research Agent 案例 |
| --- | --- | --- |
| Symptom（症状） | 用户或测试看到的异常现象 | Task 已显示 `cancelled`，但稍后 Step 2 又变为 `running` |
| Bug（缺陷） | 系统违反了明确规则 | `cancelled` 是终态，Research Steps 却仍被异步推进 |
| Root Cause（根因） | 触发缺陷的具体运行机制 | 取消前注册的回调仍持有旧状态，触发时没有校验 Task 身份或终态 |

不要直接“修症状”。例如隐藏 Step 2 的 UI 只能遮住现象，不能阻止后台状态继续变化。真正的修复必须切断导致终态被重新推进的执行路径。

## Debugging Funnel：调试漏斗

Debugging Funnel（调试漏斗）表示从多个可能原因出发，用证据逐层排除，最后只留下能解释全部现象的根因。

```text
可能原因很多
  ├─ 旧 timer 没有清理
  ├─ 回调使用了过期 Task 快照
  ├─ 回调没有检查 terminal status
  ├─ 取消后仍注册了下一次推进
  └─ Step 状态更新函数破坏了顺序
          ↓ 每条证据排除一部分
      可重复的时间线
          ↓
        根因
          ↓
      最小修复
```

每次调查都应问：这条新证据排除了什么？如果答案是“没有”，说明还在猜。

## Reproduction First：复现优先

Reproduction（复现）是用明确步骤让同一异常再次出现。没有复现时，修改后的“似乎正常”不能证明问题已解决。

当前项目用本地 Mock（模拟）和 Fake Timers（虚拟计时器）控制异步流程。执行期取消由 `[mock:research-cancelled]` 触发；当前没有真实取消按钮，因此学习案例不能被描述成已经存在的真实用户交互。

取消路径的可观察基线：

```text
提交带执行期取消标记的问题
  ↓ 1000 ms
Task: planning → researching → cancelled
Steps: running, pending, pending
  ↓ 再推进 3000 ms
Task 仍为 cancelled
Steps 仍为 running, pending, pending
timer 数量为 0
```

这里保留 `running` Step 是终止瞬间的 Plan 快照，不代表后台仍在执行。

## Minimal Reproduction：最小复现

Minimal Reproduction（最小复现）只保留触发问题所需的最少输入、状态和事件顺序。它的目标不是还原整个页面，而是隔离最短失败路径。

对于“取消后异步继续执行”，最小复现应只包含：

1. 创建一个 `ResearchTask`；
2. 让首个 `ResearchStep` 进入 `running`；
3. 将 Task 转为 `cancelled`；
4. 推进虚拟时间；
5. 断言 Task、Steps 和计时器没有变化。

先不要混入网络请求、真实等待、样式、报告生成或多个页面。这些不是当前问题成立的必要条件。

## Expected Behavior 与 Actual Behavior

Expected Behavior（正确行为）来自规格和不变量；Actual Behavior（实际行为）来自运行时证据。两者必须写成可比较的状态，而不是“应该正常”和“好像不对”。

| 观察点 | Expected Behavior（正确行为） | Actual Behavior（实际行为，假想回归） |
| --- | --- | --- |
| 取消后 Task | 一直保持 `cancelled` | 先是 `cancelled`，稍后又被推进 |
| 取消后 Steps | 冻结为取消瞬间的快照 | Step 1 完成，Step 2 进入 `running` |
| 后续调度 | 不再注册推进计时器 | 仍存在待执行计时器 |
| 旧任务回调 | 不能影响当前 Task | 旧回调改写了后来提交的新 Task |

如果无法指出首次出现差异的时间点，说明证据粒度还不够。

## Hypothesis-driven Debugging

Hypothesis-driven Debugging（假设驱动调试）先提出可验证的原因，再设计最小实验确认或排除，而不是看到异步问题就重写整个状态管理。

好的假设包含三部分：

```text
因为【具体机制】，
所以在【特定条件】下会看到【可观察结果】；
如果看不到该结果，这个假设就被排除。
```

例：

> 因为旧定时器没有在新 Task 提交时清理，所以在 Task A 等待 500 ms 后提交 Task B，再推进 500 ms，A 的回调会提前推进 B；如果 B 仍处于 `planning`，这个假设就不成立或需要进一步收窄。

## Falsifiable Hypothesis：可证伪假设

Falsifiable Hypothesis（可证伪假设）必须允许证据证明它是错的。

不可证伪：

> 可能是异步有问题。

可证伪：

> 取消分支执行后仍调用 `scheduleMockAdvance`，因此 `vi.getTimerCount()` 会大于 0；若计时器数量为 0，则排除该假设。

越具体的假设，越容易用一次小实验排除，调试漏斗也收得越快。

## Hypothesis Table：假设表

Hypothesis Table（假设表）用于记录“猜测—证据—结论”，防止 AI 重复提出已经被排除的原因。

| 假设 | 需要观察的证据 | 如何证伪 | 当前项目中的对应保护 |
| --- | --- | --- | --- |
| 旧 Task 回调推进了新 Task | 回调携带的 Task ID 与当前 ID 不同 | ID 不同且回调立即返回 | `scheduleMockAdvance(taskId)` 比较 `currentTask.id` |
| 终态仍被领域逻辑推进 | `advanceMockResearchTask(cancelledTask)` 成功 | 调用抛出终态错误 | 领域函数拒绝推进终态 |
| 取消后仍注册下一次 timer | 取消后 timer 数量大于 0 | `vi.getTimerCount()` 为 0 | 执行期终态分支直接 `return` |
| 重新提交没有清理旧 timer | A、B 的 timer 同时存活 | B 提交后 A 的 timer 已被清理 | `startResearch()` 先调用 `clearMockTimers()` |
| 页面卸载后回调仍执行 | 卸载后 timer 仍存在 | 卸载后 timer 数量为 0 | `onBeforeUnmount(clearMockTimers)` |

表中“当前保护”是调查入口，不是自动成立的结论；仍要用测试结果证明它在真实执行路径上生效。

## Execution Path：执行路径

Execution Path（执行路径）是一次事件从入口到状态写入经过的函数和分支。调试异步状态时，应追踪“谁创建回调、回调读取什么、谁最终写状态”。

当前成功路径：

```text
startResearch
  → clearMockTimers
  → createMockResearchTask
  → scheduleMockAdvance(task.id)
  → timer callback
  → 读取 researchTask.value
  → 校验 Task ID 与终态
  → advanceMockResearchTask
  → 写回 researchTask.value
  → 非 completed 时调度下一次推进
```

当前执行期取消路径在首次推进后进入 `cancelled` 并直接返回，不再调度下一次推进。若发生“取消后继续执行”，重点检查终态转换后的 `return`、后续调度条件、Task ID 校验和所有绕过领域转换的状态写入。

## Timeline Debugging：时间线调试

Timeline Debugging（时间线调试）按发生顺序记录事件、状态、回调身份和计时器数量，特别适合竞态与“偶尔出现”的问题。

### 执行期取消时间线

| 时间 | 事件 | Task | Steps | timer |
| --- | --- | --- | --- | --- |
| T0 | 提交问题 | `planning` | 无 Plan | 1 |
| T+1000 ms | 首次回调先启动 Step 1，再触发执行期取消 | `cancelled` | `running, pending, pending` | 0 |
| T+4000 ms | 继续推进虚拟时间 | `cancelled` | 保持不变 | 0 |

### 旧 Task 与新 Task 交错时间线

| 时间 | 事件 | 关键期望 |
| --- | --- | --- |
| T0 | 提交 Task A | A 注册一个推进 timer |
| T+500 ms | 提交 Task B | 清理 A 的 timer，B 注册自己的 timer |
| T+1000 ms | A 原到期点 | B 仍为 `planning` |
| T+1500 ms | B 到期点 | B 才进入 `researching` |

时间线能快速暴露“回调属于谁”和“状态何时首次偏离”。

## Stale State 与 Runtime Context

Stale State（过期状态）是异步回调执行时仍使用创建回调那一刻的旧数据，而不是当前真实状态。常见来源包括闭包里的旧 Task、旧 Step 索引、旧组件实例和已经失效的请求结果。

当前实现的关键策略是：回调触发时重新读取 `researchTask.value`，并用创建回调时保存的 `taskId` 与当前 Task ID 比较。这样“回调的归属”与“当前运行状态”被同时检查。

Runtime Context（运行时上下文）是定位问题所需的现场信息。对本案例，至少记录：

- 事件或回调触发时间；
- 回调所属 `taskId` 与当前 `taskId`；
- Task 当前状态和下一目标状态；
- 各 Step 状态；
- timer 数量与是否又注册了下一次；
- 触发来源：首次提交、重新提交、取消或组件卸载。

日志应短暂、针对假设且不包含密钥或用户敏感数据。根因确认后删除无长期价值的调试日志。

## Minimal Fix：最小修复

Minimal Fix（最小修复）只改变导致根因的最小机制，并保持其他合法行为不变。

若根因是“旧回调污染新 Task”，修复点应围绕回调归属校验或旧 timer 清理；若根因是“终态后继续调度”，修复点应围绕终态保护和调度停止条件。不要顺手更换状态管理库、重写组件或重新设计全部生命周期。

最小修复仍应形成完整防线：

```text
源头：替换任务或卸载时清理 timer
执行前：校验回调 taskId 与当前 Task
状态前：拒绝推进 failed / cancelled / completed
执行后：进入终态就不再调度下一次
领域层：非法终态转换直接失败
```

多层保护不是重复浪费：清理降低无效工作，身份检查阻止跨任务污染，终态规则保护领域不变量。

## Control Variables：控制变量

Control Variables（控制变量）意味着一次实验只改变一个关键条件，使结果能归因到某个假设。

本案例可以分别控制：

- 只改变时间：每次只推进 500 ms 或 1000 ms；
- 只改变 Task 身份：A 未到期时提交 B；
- 只改变终态：比较正常、`failed`、`cancelled`；
- 只改变生命周期：挂载状态与卸载状态对比；
- 固定输入、Step 数量和 Mock 计划，避免无关差异。

一次同时修改 timer、状态机、组件结构和测试，会失去因果归属，即使测试变绿也不知道哪项改动真正有效。

## Debugging 与 Refactoring 分离

Debugging（调试）解决已经被证据确认的缺陷；Refactoring（重构）在不改变行为的前提下改善结构。两者应分开执行和审查。

```text
先：复现失败 → 最小修复 → 回归测试变绿
再：如确有必要，单独重构 → 同一组行为测试继续为绿
```

把调试和重构混在一个 Diff（差异）中会扩大 Change Surface（变更面），增加新回归，也让审查者无法确认哪一行是必要修复。

## Regression Verification：回归验证

Regression Verification（回归验证）不仅证明原问题消失，还证明修复没有破坏相邻路径。

针对取消与异步推进，至少验证：

1. 复现用例由红变绿，且测试在修复前确实能失败；
2. `cancelled` 后继续推进时间，Task 与 Steps 保持冻结；
3. 取消后 timer 数量为 0；
4. `failed` 路径同样停止推进；
5. 正常路径仍按顺序完成 3 个 Steps；
6. 任一时刻最多一个 Step 为 `running`；
7. 旧 Task timer 不能推进新 Task；
8. 组件卸载后 timer 被清理；
9. 领域层继续拒绝非法终态转换；
10. Diff 只包含调试所需范围。

当前项目使用虚拟计时器验证这些时间边界，不应改用真实等待来掩盖竞态。

## AI 调试常见错误

- 一上来就修改代码，没有先复现和写出正确／实际行为。
- 用“可能是异步问题”代替可证伪假设。
- 同时提出很多原因，却不说明每个原因需要什么证据。
- 只看静态代码，不重建实际执行路径和事件时间线。
- 只检查最终 UI，没有检查 Task、Steps、timer 和回调归属。
- 把症状隐藏掉，却没有阻止非法状态变化。
- 一次大范围重写，使根因和有效修复无法归因。
- 为了让测试通过而放宽断言、删除竞态用例或更新成错误期望。
- 只验证取消路径，忘记正常、失败、重新提交和卸载路径。
- AI 声称“已修复”，但没有失败复现、通过结果和 Diff 证据。

更有效的 AI 调试请求是：

> 先不要修改代码。根据规格、失败测试和执行路径，分别列出正确行为、实际行为、可证伪假设、每个假设所需证据，以及最小复现。证据足以定位根因后，再提出最小修复和回归验证范围。

## Debug Done：调试完成的定义

Debug Done（调试完成）不是“测试现在是绿的”，而是同时满足：

- [ ] 症状可稳定复现，复现步骤足够小；
- [ ] 正确行为与实际行为有明确状态差异；
- [ ] 已找到能解释全部证据的根因，而非只列出可能性；
- [ ] 关键假设经过确认或证伪，调查记录没有自相矛盾；
- [ ] 修复直接对应根因，且没有混入无关重构；
- [ ] 原复现用例在修复前失败、修复后通过；
- [ ] 正常、失败、取消、竞态、重新提交和清理等相邻路径已按风险回归；
- [ ] Task 终态、Step 顺序和“最多一个 `running`”等不变量仍成立；
- [ ] 没有弱化测试或绕过领域状态转换；
- [ ] 已审查 Diff，能说明每项修改为什么必要；
- [ ] 完成结论附有实际验证证据和仍未覆盖的风险。

## 1 分钟复习

1. AI 调试的目标是用证据缩小范围，不是让 AI 连续猜修复。
2. Symptom 是现象，Bug 是规则被违反，Root Cause 是导致违反的具体机制。
3. 先建立稳定的 Minimal Reproduction，再改代码。
4. 把 Expected Behavior 和 Actual Behavior 写成可比较的状态与时间点。
5. 好假设必须可证伪；用假设表记录证据和排除结果。
6. 异步问题要同时追踪 Execution Path、Timeline、Task ID、状态和 timer。
7. 警惕 Stale State；回调执行时要确认它属于当前任务并读取当前状态。
8. 一次实验控制一个变量，调试和重构分开。
9. Minimal Fix 必须直指根因，Regression Verification 必须覆盖相邻路径。
10. Debug Done = 可复现 + 根因明确 + 最小修复 + 回归证据 + Diff 可解释。
