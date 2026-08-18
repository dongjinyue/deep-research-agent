<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import {
  createMockResearchTask,
  MOCK_RESEARCH_STATUS_SEQUENCE,
  RESEARCH_TASK_STATUS_LABELS,
  type ResearchTask,
} from './research-task'

const question = ref('')
const researchTask = ref<ResearchTask | null>(null)
const mockTimers: number[] = []

const canStartResearch = computed(() => question.value.trim().length > 0)
const currentStatus = computed(() => researchTask.value?.status ?? 'idle')
const currentStatusLabel = computed(() => RESEARCH_TASK_STATUS_LABELS[currentStatus.value])

function clearMockTimers() {
  mockTimers.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function startResearch() {
  if (!canStartResearch.value) return

  clearMockTimers()

  const task = createMockResearchTask(question.value)
  researchTask.value = task

  MOCK_RESEARCH_STATUS_SEQUENCE.slice(1).forEach((status, index) => {
    const timer = window.setTimeout(() => {
      if (researchTask.value?.id !== task.id) return

      researchTask.value = {
        ...researchTask.value,
        status,
      }
    }, (index + 1) * 1000)

    mockTimers.push(timer)
  })
}

onBeforeUnmount(clearMockTimers)
</script>

<template>
  <main class="project-shell">
    <section class="research-card" aria-labelledby="page-title">
      <p class="eyebrow">Deep Research Agent</p>
      <h1 id="page-title">开始一次深度研究</h1>
      <p class="summary">
        输入一个需要搜索、核验和整理资料的问题。Day 1 只创建本地 Mock Task，不会调用真实研究服务。
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
          <p class="field-hint">当前状态由前端 Mock 自动推进，不会调用真实研究服务。</p>
        </template>
        <p v-else class="field-hint">提交研究问题后将创建本地 Mock Research Task。</p>
      </section>
    </section>
  </main>
</template>
