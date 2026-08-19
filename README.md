# Deep Research Agent + Evaluation Lab

这是 30 天 AI-native Development 学习项目。当前先完成 Deep Research Agent，Evaluation Lab 会在后续阶段逐步加入。

## 当前状态

Day 1 基础切片已完成：

- 明确产品 MVP 与非目标。
- 建立 Vue 3 + TypeScript 前端基础。
- 实现 Research Question Input 的本地交互。
- 建立 3 个初始 Evaluation Cases。
- 建立类型检查、单元测试和生产构建验证。

当前页面不会调用 LLM、搜索 API 或后端服务。提交研究问题只会创建一个本地 Mock Research Task。

Day 3 Research Plan 规格切片已完成：

- 创建有效 Task 后先进入 `planning`；1 秒后前端固定 Mock Plan 生成成功，再进入 `researching`。
- Plan 包含 3 个步骤；`planning` 期间尚无 Plan，成功进入 `researching` 时第一步开始执行。
- Step 使用独立于 Task 的状态类型，按 `pending → running → completed` 串行推进。
- Task 在 Plan 创建后按 `planning → researching → generating → completed` 自动推进。
- 本地开发/测试可用 `[mock:failed]` 和 `[mock:cancelled]` 模拟 `planning` 期间的两个 Task 终态；此时不生成 Plan，标记不会写入 `question`，也不是正式输入协议。
- 页面没有 Task 时显示 `idle`；它不属于 Research Task 状态。
- 正常状态与两个终态都会显示对应的中文含义，失败状态同时携带结构化错误。
- 页面只展示 Plan 的必要信息和离散状态，不展示虚假精确的进度百分比。

当前仍不会调用 LLM、搜索 API、数据库或后端服务，也不支持 Plan 重新生成、历史切换、编辑、并行步骤或 Step 级失败传播。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vitest + Vue Test Utils
- pnpm

## 目录

- `apps/web/`：Vue Web 应用。
- `docs/product-spec.md`：当前 MVP 产品规格。
- `docs/evals/research-cases.md`：初始研究评测 Case。
- `docs/day-1-review.md`：Day 1 Code/Thinking Review。
- `vibe-coding-notes/`：可长期复习的 AI-native Development 知识笔记。

## 本地运行

```bash
cd apps/web
pnpm install
pnpm dev
```

## 验证

```bash
pnpm type-check
pnpm test
pnpm build
```
