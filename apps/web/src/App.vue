<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import {
  advanceMockResearchTask,
  createMockResearchTask,
  PAGE_IDLE_STATUS,
  PAGE_IDLE_STATUS_LABEL,
  RESEARCH_STEP_STATUS_LABELS,
  RESEARCH_TASK_STATUS_LABELS,
  type MockResearchTerminalStatus,
  type ResearchTask,
} from './research-task'

const MOCK_FAILED_MARKER = '[mock:failed]'
const MOCK_CANCELLED_MARKER = '[mock:cancelled]'

const question = ref('')
const researchTask = ref<ResearchTask | null>(null)
const mockTimers: number[] = []

// 开发标记在创建 Task 前被剥离，避免测试控制信息污染真实研究问题。
function parseLocalMockInput(rawQuestion: string): {
  question: string
  terminalStatus?: MockResearchTerminalStatus
} {
  const normalizedQuestion = rawQuestion.trim()
  const terminalStatus = normalizedQuestion.includes(MOCK_FAILED_MARKER)
    ? 'failed'
    : normalizedQuestion.includes(MOCK_CANCELLED_MARKER)
      ? 'cancelled'
      : undefined

  return {
    question: normalizedQuestion
      .replaceAll(MOCK_FAILED_MARKER, '')
      .replaceAll(MOCK_CANCELLED_MARKER, '')
      .trim(),
    terminalStatus,
  }
}

// 生产构建只接收普通问题，不把本地 Mock 标记暴露为产品输入协议。
const researchInput = computed(() =>
  import.meta.env.DEV
    ? parseLocalMockInput(question.value)
    : { question: question.value.trim() },
)
const canStartResearch = computed(() => researchInput.value.question.length > 0)
const currentStatus = computed(() => researchTask.value?.status ?? PAGE_IDLE_STATUS)
const currentStatusLabel = computed(() =>
  researchTask.value
    ? RESEARCH_TASK_STATUS_LABELS[researchTask.value.status]
    : PAGE_IDLE_STATUS_LABEL,
)

function clearMockTimers() {
  // 重新提交或卸载页面时清理旧任务定时器，防止它继续改写新任务状态。
  mockTimers.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function scheduleMockAdvance(taskId: string) {
  const timer = window.setTimeout(() => {
    const currentTask = researchTask.value
    // 只推进创建当前定时器的 Task，避免旧回调影响后来提交的 Task。
    if (!currentTask || currentTask.id !== taskId) return
    if (currentTask.status === 'failed' || currentTask.status === 'cancelled') return
    if (currentTask.status === 'completed') return

    researchTask.value = advanceMockResearchTask(currentTask)

    if (researchTask.value.status !== 'completed') {
      scheduleMockAdvance(taskId)
    }
  }, 1000)

  mockTimers.push(timer)
}

function startResearch() {
  if (!canStartResearch.value) return

  clearMockTimers()

  const task = createMockResearchTask(
    researchInput.value.question,
    researchInput.value.terminalStatus,
  )
  researchTask.value = task

  // 本地 Mock 终态不会继续注册成功路径的定时推进。
  if (task.status === 'failed' || task.status === 'cancelled') return

  scheduleMockAdvance(task.id)
}

onBeforeUnmount(clearMockTimers)
</script>

<template>
  <main class="project-shell">
    <section class="research-card" aria-labelledby="page-title">
      <p class="eyebrow">Deep Research Agent</p>
      <h1 id="page-title">开始一次深度研究</h1>
      <p class="summary">
        输入一个需要搜索、核验和整理资料的问题。当前只生成并执行前端固定 Mock 计划，不会调用真实研究服务。
      </p>

      <form class="research-form" @submit.prevent="startResearch">
        <label for="research-question">Research Question</label>
        <textarea
          id="research-question"
          v-model="question"
          name="research-question"
          rows="5"
          aria-describedby="question-hint"
          placeholder="例如：Vue 和 React 哪个更适合大型 SaaS？"
        />
        <p id="question-hint" class="field-hint">请描述需要研究的问题，空问题不能提交。</p>
        <button type="submit" :disabled="!canStartResearch">开始研究</button>
      </form>

      <section class="task-status" role="status" aria-live="polite">
        <p class="status-label">Research Task 状态</p>
        <p class="submitted-question">
          <code>{{ currentStatus }}</code>
          · {{ currentStatusLabel }}
        </p>
        <template v-if="researchTask">
          <p class="submitted-question">{{ researchTask.question }}</p>
          <p v-if="researchTask.error" class="field-hint">
            {{ researchTask.error.message }}（{{ researchTask.error.code }}）·
            {{ researchTask.error.retryable ? '可重试' : '不可重试' }}
          </p>
          <p class="field-hint">当前状态由前端 Mock 自动推进，不会调用真实研究服务。</p>
        </template>
        <p v-else class="field-hint">提交研究问题后将创建本地 Mock Research Task。</p>
      </section>

      <section
        v-if="researchTask?.plan"
        class="research-plan"
        aria-labelledby="research-plan-title"
      >
        <h2 id="research-plan-title">研究计划</h2>
        <p class="field-hint">以下步骤来自前端固定 Mock 模板，仅用于验证计划与状态流转。</p>
        <ol class="research-steps">
          <li v-for="step in researchTask.plan.steps" :key="step.id">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
            <p class="step-status">
              <code>{{ step.status }}</code>
              · {{ RESEARCH_STEP_STATUS_LABELS[step.status] }}
            </p>
          </li>
        </ol>
      </section>
      <p v-else-if="researchTask" class="plan-placeholder">
        {{
          researchTask.status === 'planning'
            ? '正在生成前端 Mock 研究计划…'
            : '研究计划未生成。'
        }}
      </p>
    </section>
  </main>
</template>
