# Deep Research Agent + Evaluation Lab

这是 30 天 AI-native Development 学习项目。当前先完成 Deep Research Agent，Evaluation Lab 会在后续阶段逐步加入。

## 当前状态

Day 1 已完成：

- 明确产品 MVP 与非目标。
- 建立 Vue 3 + TypeScript 前端基础。
- 实现 Research Question Input 的本地交互。
- 建立 3 个初始 Evaluation Cases。
- 建立类型检查、单元测试和生产构建验证。

当前页面不会调用 LLM、搜索 API 或后端服务。提交研究问题只会创建一个本地 Mock Research Task。

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
