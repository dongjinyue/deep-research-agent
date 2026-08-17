# Vibe Coding Mental Model

## 一句话理解

高级 Vibe Coding 不是让 AI 写更多代码，而是由人明确 Intent、提供 Context、设置 Constraints，并通过 Verification 控制 AI 完成软件工程任务。

## 为什么重要

AI 即使不了解真实需求，也能非常快地生成一套看起来合理的代码。这带来一个危险错觉：

> 能运行 = 已完成。

实际上，AI 可能解决了错误的问题、扩大了范围、引入了不必要依赖，或者只覆盖了 Happy Path。项目越大，这些没有被发现的错误决策越容易积累成技术债。

## 必须记住 🔴

```text
AI Coding Quality
≈
Intent × Context × Constraints × Verification
```

这不是数学公式，而是检查思路。任何一项接近零，整体质量都会迅速下降。

### Intent：为什么做

Intent 描述要解决的问题，而不是提前指定文件和代码。

```text
Intent
├── Goal
├── User
├── Context
├── Constraints
└── Success Criteria
```

差的表达：

> 帮我写一个研究页面。

更好的表达：

> 让知识工作者输入研究问题并创建 Research Task。当前只实现 Vue 前端输入和本地 Mock 状态，不接 API。空输入不能提交，并用测试验证。

### Context：模型需要知道什么

Context Engineering 不是把 Prompt 写得无限长，而是：

> 在正确的时间，向模型提供完成当前决策所需的正确信息。

常见 Context 包括：

- Product Spec。
- 项目结构和已有代码。
- 技术栈与项目约定。
- 与当前任务相关的文件。
- 已知错误、测试结果和 Git Diff。
- 上一步的决策与尚未解决的歧义。

不要只问“Prompt 应该怎么写？”，更应该问：

> 模型要做出这个决定，需要知道哪些信息？

### Constraints：什么不能做

Constraints 用来控制 Change Surface 和 Scope。

示例：

- 使用 Vue 3 + TypeScript。
- 不增加 UI Library。
- 不接后端或 LLM API。
- 只修改与当前任务直接相关的文件。
- 不实现 Future Scope。
- 不确定产品行为时先指出歧义。

### Verification：如何证明做对了

不要相信“Done”，要检查证据。

```text
Verification
├── 是否符合 Spec
├── Type Check
├── Automated Tests
├── Production Build
├── Runtime / Browser Check
├── Console Errors
├── Dependency Review
└── Git Diff Review
```

测试通过也不代表产品一定正确；测试只能证明它覆盖的行为通过了。因此 Verification 必须同时检查需求、运行行为和变更范围。

## Vibe Coding 的四个层级 🟡

### Level 1：AI 是搜索引擎

人向 AI 询问语法、API 或概念，工作流仍以问答为主。

### Level 2：AI 是代码生成器

人描述一个页面或函数，AI 返回代码。效率提高，但模型会补全大量隐式决策。

### Level 3：AI 是工程协作者

人提供目标、上下文、约束和验收标准，AI 参与探索、计划、实现、测试和 Review。

### Level 4：Agentic Engineering

Agent 获得读取文件、搜索代码、修改文件、运行测试和查看 Diff 等工具，并在目标与约束下循环执行：

```text
Goal
→ Observe
→ Reason
→ Act
→ Observe
→ Verify
```

层级提高不代表人不再负责。Agent 越自主，越需要清楚的权限边界、可观察性和 Verification。

## Implicit Decisions：隐式决策

当需求没有说明时，AI 通常不会停止，而是根据训练数据和常见模式自行补全。

它可能替你决定：

- 使用哪个 UI Library。
- 页面结构和交互流程。
- API 和数据模型。
- 状态管理方式。
- 是否需要登录、数据库或缓存。
- 错误、空状态和 Loading 如何表现。
- 成功标准是什么。

单个默认决定不一定错误，危险在于人没有意识到这个决定已经发生。

处理方法：

1. 在写代码前让 AI 列出歧义。
2. 区分已确认事实、合理假设和待确认问题。
3. 对影响范围大的决定要求说明理由与替代方案。
4. 把关键决定写入 Spec，而不是只留在聊天记录里。

## Spec-driven Development

Spec 的目的不是写一篇漂亮文档，而是减少 Ambiguity。

一个最小 Product Spec 至少应包含：

```text
Problem
Target User
Core User Flow
MVP Features
Non-goals
Constraints
Success Criteria
```

### Problem 与 Implementation 要分开

Problem：用户为什么需要这个能力。

Implementation：用哪些文件、组件和技术实现。

先让 AI 理解 Problem，再讨论 Implementation，可以避免模型过早锁定方案。

### Non-goals 必须明确

“暂时没提到登录”不等于“禁止实现登录”。如果某项能力明确不属于当前任务，应把它写入 Non-goals。

### Success Criteria 必须可观察

模糊标准：

> 页面体验良好。

可验证标准：

> 用户能够输入非空问题并创建 Mock Task；空输入时按钮禁用；对应测试和生产构建通过。

## 推荐工作流

```text
Explore
→ Clarify
→ Plan
→ Implement
→ Verify
→ Review Diff
→ Feedback
```

### 1. Explore

- 阅读 Spec 和项目结构。
- 找出相关代码与既有约定。
- 不修改代码。
- 输出歧义、风险和可能受影响的文件。

### 2. Clarify

- 解决会改变产品行为或架构的歧义。
- 小而可逆的实现细节可以记录为假设。
- 不把关键决策静默交给 AI。

### 3. Plan

- 拆成能够独立验证的小步骤。
- 每一步写清输出和验证方式。
- 明确本次不做的部分。

### 4. Implement

- 一次只实现一个小切片。
- 遵守现有架构和约束。
- 不顺手重构无关内容。

### 5. Verify

- 运行 Type Check、Tests 和 Build。
- 检查真实交互与错误状态。
- 对照 Success Criteria，而不是对照 AI 的完成声明。

### 6. Review Diff

- 修改了哪些文件？
- 每个修改是否都与当前目标有关？
- 是否出现新依赖或 Scope Expansion？
- 是否有无法解释的大段生成代码？

## Change Surface

Change Surface 是一次任务触及的文件、模块、依赖和行为范围。

AI 可以一次修改几十个文件，但人通常无法可靠 Review 如此大的变化。控制方法：

- 缩小任务切片。
- 限定允许修改的目录或文件。
- 先 Plan，再按步骤实现。
- 每个切片完成后立即验证和查看 Diff。
- 把顺手优化放进单独任务。

## 常见错误

### 1. 一次让 AI 实现整个产品

结果通常是大量隐式决策、难以 Review 的 Diff 和无法定位的错误。

### 2. 只有 Goals，没有 Non-goals

AI 会把常见产品功能当作合理补全，造成 Scope Explosion。

### 3. 把工具选择当作学习目标

模型、IDE 和 Coding Agent 会变化。Intent、Context、Constraints、Verification 才是可迁移能力。

### 4. 只检查页面“看起来能用”

还需要类型检查、测试、构建、Console、边界状态和 Diff Review。

### 5. 让 AI 替人承担最终判断

AI 可以建议架构、实现和测试，但目标是否正确、风险是否接受、是否可以发布，仍由人负责。

## Best Practices

- 先描述问题，再讨论文件和代码。
- 要求 AI 区分事实、假设和待确认问题。
- 先写 Non-goals，主动阻止 Scope Expansion。
- 计划必须包含验证方式。
- 一次只增加必要的不确定性。
- 保留 Spec、关键决策、测试结果和 Git 历史。
- 看到“Successfully completed”时，条件反射地检查 Diff 和 Tests。

## Checklist

开始实现前：

- [ ] Goal 和 Target User 是否明确？
- [ ] 当前任务的 Context 是否足够？
- [ ] Non-goals 和技术约束是否写清？
- [ ] Success Criteria 是否可观察、可验证？
- [ ] AI 是否指出了重要歧义？
- [ ] Plan 是否拆成小步骤？

AI 声称完成后：

- [ ] 实际行为是否符合 Spec？
- [ ] Type Check、Tests、Build 是否通过？
- [ ] Runtime 和 Console 是否正常？
- [ ] 是否偷偷增加依赖或 Future Scope？
- [ ] 是否亲自看过 Git Diff？
- [ ] 能否解释每一项关键修改为什么存在？

## 面试时怎么讲

> 我不会直接让 Coding Agent 生成整个功能。我先把需求整理成包含 Intent、Non-goals、Constraints 和 Success Criteria 的 Spec，然后让 Agent 探索代码库并给出可独立验证的计划。我按小切片控制 Change Surface，每一步都运行类型检查、测试和构建，最后通过真实交互和 Git Diff 验证。AI 负责加速探索和实现，我负责产品边界、架构判断和最终质量。

## 一分钟复习

1. Prompt 不是核心，Intent 才是起点。
2. Context Engineering 是在正确时间提供正确的信息。
3. Constraints 和 Non-goals 用来控制 Scope。
4. Spec 的价值是消除 Ambiguity，不是追求文档漂亮。
5. AI 会填补隐式决策，必须让关键决定显性化。
6. 使用 `Explore → Plan → Implement → Verify` 控制过程。
7. 控制 Change Surface，保持 Diff 可 Review。
8. Never trust “Done”. Verify it.
