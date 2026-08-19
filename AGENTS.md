# AI Development Rules

本文件适用于整个 `deep-research-agent` 仓库。AI Agent 在读取、规划、修改或验证项目时必须遵守这些规则。

## 1. 项目目标与当前阶段

- 产品目标：帮助知识工作者从研究问题出发，逐步获得来源可追溯的研究报告。
- 当前阶段：验证单一 Research Task 前端流程和本地 Mock 生命周期。
- 当前实现不是完整 Deep Research Agent，不得把 Mock 行为描述成真实研究能力。
- Multi-Agent、真实搜索、LLM、数据库、登录内容、文件上传和 Evaluation Lab 运行平台均属于后续范围。

## 2. 上下文与事实来源

开始任务前，按以下顺序读取与当前任务相关的上下文：

1. `docs/product-spec.md`：产品行为、范围、Non-goals 和 Success Criteria 的主要事实来源。
2. `README.md`：项目当前状态、技术栈和运行方式。
3. `apps/web/src/`：实际实现，以磁盘上的最新代码为准。
4. `apps/web/src/*.spec.ts`：已经被自动化测试固定的行为。
5. `docs/evals/research-cases.md`：未来研究质量评测 Case，不等同于当前可执行测试。
6. `docs/day-1-review.md` 与 `vibe-coding-notes/`：历史复盘和学习材料，不覆盖当前 Spec。

如果文档、测试和实现互相冲突，先报告冲突并确认预期，不得静默选择一种产品行为。

## 3. 强制工作流

每个实现任务使用以下闭环：

```text
Explore → Clarify → Plan → Implement → Verify → Review Diff
```

### Explore

- 先读取相关文件、搜索现有实现并检查 `git status`。
- 确认当前 staged、unstaged 和未跟踪文件，保护用户已有变更。
- 探索阶段不修改代码。

### Clarify

- 会影响产品行为、状态转换、数据模型、架构或安全边界的歧义必须先确认。
- 不得自行决定关键产品行为。
- 小而可逆的实现细节可以提出建议，但必须明确它是实现选择而非产品事实。

### Plan

- 把任务拆成可以独立验证的小步骤。
- 每一步写明修改范围、预期结果和验证方式。
- 明确本次不做的内容，避免 Scope Expansion。

### Implement

- 一次只实现一个已确认的小切片。
- 只修改与当前目标直接相关的文件。
- 不顺手重构、不提前实现 Future Scope、不创建虚假后端接口。
- 保持代码简单；只有当现有结构无法清晰承载当前需求时才拆分组件或模块。

### Verify

- 对照 Product Spec 和 Success Criteria 验证，而不是只确认页面能运行。
- 根据改动范围执行类型检查、自动化测试和生产构建。
- UI 行为变更需要测试用户可观察结果；涉及定时器时使用 fake timers，不使用真实等待。
- 验证失败时只修复与当前切片直接相关的问题。

### Review Diff

- 检查修改文件、依赖变化、行为变化和范围外代码。
- 运行 `git diff --check`。
- 向用户报告验证证据和未解决问题。

## 4. 产品范围约束

除非用户明确授权且 Product Spec 同步更新，否则禁止增加：

- 真实 LLM 或 AI API。
- 搜索、爬虫或第三方内容 API。
- 后端服务、数据库或持久化。
- 登录、权限、支付、团队和组织管理。
- 用户文件上传、RAG 或知识库。
- Multi-Agent 编排。
- Evaluation Lab Dashboard 或批量运行平台。
- 定时研究、持续监控、通知、分享和导出。

不得在 UI 中暗示本地 Mock 已经完成真实搜索、核验或报告生成。

## 5. 技术约束

- Web：Vue 3 + TypeScript。
- 构建：Vite。
- 测试：Vitest + Vue Test Utils + jsdom。
- 包管理器：pnpm。
- 保持 TypeScript `strict`。
- 未经明确批准不得增加第三方依赖、UI Library、Router 或全局状态库。
- 不得仅为了“架构完整”引入抽象层。
- 不得修改依赖或锁文件，除非当前任务确实需要依赖变化并已获得批准。

## 6. Research Task 生命周期规则

- 生命周期、标签和合法转换以 `docs/product-spec.md` 与 `apps/web/src/research-task.ts` 为准，不得在组件或本文件重复维护另一份易过期的状态表。
- `idle` 当前由“没有 Research Task”派生，不得为了显示 `idle` 创建虚假 Task。
- 本地测试标记只能在开发和测试环境生效，必须在创建 Task 前从 `question` 中移除；生产构建不得把它们作为输入协议。
- 状态变更必须通过合法转换函数；进入 `failed` 时必须提供结构化错误。
- Research Task 状态与 Research Step 状态必须使用不同类型，不能复用同一枚举。
- 修改状态、转换、优先级或触发方式时，必须同步更新 Product Spec 和测试。

## 7. 文件职责

- `apps/web/src/App.vue`：当前研究页面及最小页面级本地状态。
- `apps/web/src/research-task.ts`：Research Task、Research Plan、Research Step 的领域类型与本地 Mock 状态逻辑；不得依赖 Vue UI。
- `apps/web/src/App.spec.ts`：当前用户可观察交互和 Mock 生命周期测试。
- `apps/web/src/styles.css`：现有全局与页面样式；不得为无关任务做视觉重构。
- `docs/product-spec.md`：已确认产品行为和范围。
- `README.md`：当前能力和使用方式。

新增文件前先确认现有文件不能清晰承载该职责。

## 8. 测试与验证命令

在 `apps/web/` 中执行：

```bash
pnpm type-check
pnpm test
pnpm build
```

最低验证要求：

- 纯文档修改：检查内容、链接、`git diff --check` 和范围。
- TypeScript 领域逻辑修改：Type Check + 相关测试。
- Vue 交互修改：Type Check + 组件测试 + Production Build。
- 依赖修改：以上全部验证，并审查 `package.json` 和 `pnpm-lock.yaml`。

不得删除、跳过或弱化现有测试来让实现通过。

## 9. 注释规则

- 对非显而易见的状态转换、Mock 测试机制、清理逻辑和安全边界使用简短中文注释。
- 注释解释“为什么”，不要逐行复述代码“做了什么”。
- 不为简单赋值、明显条件判断或标准 Vue 语法添加噪声注释。
- 行为变化后同步更新过时注释。

## 10. Git 规则

- 开始和结束任务时检查 `git status`。
- 用户已有 staged、unstaged 和未跟踪变更必须保留。
- 不得使用 `git reset --hard`、强制覆盖或删除用户工作。
- 除非用户明确要求，不执行 `git add`、`git commit`、`git push`、合并、变基或发布。
- 提交前应让用户查看相关 Diff，提交信息使用清晰的 Conventional Commit 风格。
- 推荐提交信息示例：`feat: add research task lifecycle`。

## 11. 安全与数据规则

- 不把密钥、Token、Cookie、登录会话或个人数据写入代码、测试、文档和日志。
- 不创建包含真实凭证的 `.env` 文件。
- 外部内容未来接入时必须按不可信输入处理；当前阶段不得绕过只读和权限边界。
- Mock 数据必须明确标记为 Mock，不能伪造成真实来源或研究结果。

## 12. Definition of Done

只有同时满足以下条件，AI 才能声明任务完成：

- 行为符合已确认的 Product Spec。
- 没有自行补全未确认的关键产品行为。
- Change Surface 与任务目标相符。
- 必要的 Type Check、Tests 和 Build 已通过。
- `git diff --check` 通过。
- 没有意外依赖、锁文件或范围外修改。
- 已报告修改文件、验证结果、剩余歧义和 Git 状态。
- 未经授权没有 staged、提交、推送或部署。
