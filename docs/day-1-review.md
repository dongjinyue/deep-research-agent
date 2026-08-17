# Day 1 Code / Thinking Review

> 状态：修正后通过
> 说明：原始 Bad Vibe Coding 对话和第一次 Implementation Plan 没有被保存，因此本文不会伪造历史记录。下面将“可从产物识别的隐式决策”和“修正后的参考计划”明确分开。

## 1. Code Review 结论

修正前，项目的工程基础可以运行，但没有完成 Day 1 的学习闭环：

- 页面只有“Vue 项目已就绪”，缺少 Research Question Input。
- Product Spec 把 Multi-Agent、登录会话读取和完整 Evaluation Lab 放进了 MVP，范围过大。
- README 与真实技术栈不一致。
- 项目没有 Git 仓库，无法 Review Diff 或检查提交。
- 5 个隐式决策、第一次 Implementation Plan 和核心反思没有留下记录。

修正后，项目只实现 Day 1 可独立验证的最小切片：

- 基础 Layout。
- Research Question 输入。
- 空输入校验。
- 本地 Mock Research Task 创建。
- 对应的自动化测试。
- 不调用 LLM、搜索 API、数据库或后端。

## 2. 从当前产物识别出的隐式决策

以下不是对原始实验记录的伪造，而是通过回看旧产物识别出的、当时没有被明确讨论的决策。

### 决策 1：默认采用 Vite + pnpm + Vitest

课程只要求 Vue 3 + TypeScript，但构建工具、包管理器和测试框架由实现过程直接决定了。

这些选择本身合理，问题在于：如果没有记录，人就不知道这是明确选择还是 AI 的默认偏好。

### 决策 2：研究计划展示后自动执行

旧 Spec 直接规定用户无需确认研究计划。这个行为会影响成本控制、用户掌控感和错误研究方向的风险，应该由产品 Intent 决定，而不应由 AI 默认决定。

### 决策 3：MVP 使用 Multi-Agent

旧 Spec 将多个 Agent 搜索、阅读和交叉验证写入 MVP。Multi-Agent 会增加编排、状态同步、错误处理、成本和 Eval 难度，不应该在单一 Agent Loop 尚未验证时默认加入。

### 决策 4：读取登录内容并复用浏览器会话

这会引入权限、安全、隐私、Prompt Injection 和只读保障等复杂问题。它不是普通的数据源选项，而是一个需要独立设计与验证的安全边界。

### 决策 5：Day 1 就定义完整 Evaluation Lab

旧 Spec 同时设计题集、批量运行、事实拆解、评审 Agent 和横向比较。这让一个原本只需建立研究输入页的任务，扩大成两个复杂产品。

### 决策 6：成功标准使用“可直接支持工作决策”

这句话表达了愿景，但无法直接验收。如果没有明确用户任务、评价方式和阈值，AI 和人都无法判断产品是否真的完成。

## 3. 修正后的 Implementation Plan

原始的第一次 Plan 没有保存。下面是依据 Day 1 目标重建的正确参考版本，而不是声称它就是当时的原文。

1. 阅读 Product Spec，找出 Day 1 范围和仍然存在的歧义。
2. 将超出范围的能力移到 Future Scope，并写清 Non-goals。
3. 建立 Vue 3 + TypeScript 基础 Layout。
4. 实现 Research Question Input 和空输入校验。
5. 提交后只创建本地 Mock Research Task，不定义虚假 API。
6. 为基础渲染、空输入和成功提交编写测试。
7. 运行 Type Check、Test 和 Production Build。
8. 检查页面交互、浏览器错误和 Git Diff。
9. 只在全部通过后提交 Day 1 变更。

计划的关键不是步骤多，而是每一步都能单独验证，并且不会偷偷实现后续功能。

## 4. “让 AI 帮我写代码”与“用 AI 开发软件”的区别

### 让 AI 帮我写代码

关注的是 Implementation：

> 我需要一个页面、组件或函数，请 AI 生成代码。

人通常在代码生成后才开始判断结果，AI 会替人补全大量没有被说明的产品和技术决策。

### 用 AI 开发软件

关注的是完整工程闭环：

```text
Intent
→ Context
→ Constraints
→ Spec
→ Plan
→ Implement
→ Verify
→ Review
→ Feedback
```

人负责目标、边界、架构判断和最终验收；AI 负责在这些约束中探索、计划和实现。衡量标准不是“AI 写了多少代码”，而是“结果是否解决了正确的问题，并且证据足以证明它做对了”。

一句话总结：

> 让 AI 写代码，是把 AI 当生成器；用 AI 开发软件，是把 AI 放进一个由人设计和验证的工程系统。

## 5. Verification Evidence

- TypeScript Type Check：通过。
- Vitest：1 个测试文件、2 个测试全部通过。
- Vite Production Build：通过。
- 浏览器交互：空输入按钮禁用；输入后启用；提交后显示 Mock Research Task。
- 页面布局：1024px 宽视口无横向溢出。
- Browser Console：无 Error。
- Scope Review：没有 LLM、搜索 API、RAG、数据库、登录或 Multi-Agent 实现。

## 6. Day 1 最终验收

- [x] 符合建议的项目结构。
- [x] Product Spec 包含目标用户、流程、Features、Non-goals、Constraints 和 Success Criteria。
- [x] 记录至少 5 个隐式决策及其风险。
- [x] 保存可验证的 Implementation Plan。
- [x] 实现简单可运行的 Vue 页面。
- [x] 创建 3 个初始 Evaluation Cases。
- [x] 完成 Type Check、Test、Build 和浏览器交互验证。
- [x] 解释“让 AI 写代码”和“用 AI 开发软件”的区别。

## 7. 你需要真正掌握的部分

本文给出的是参考答案，不替代你的理解。进入 Day 2 前，建议不看上文，用自己的话回答一次：

> 当需求不明确时，AI 为什么仍然能快速给出一个“看起来完成”的结果？我要怎样判断它是真的做对了，而不只是能运行？
