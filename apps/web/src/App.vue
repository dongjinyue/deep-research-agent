<script setup lang="ts">
import { computed, ref } from 'vue'

const question = ref('')
const submittedQuestion = ref('')

const canStartResearch = computed(() => question.value.trim().length > 0)

function startResearch() {
  if (!canStartResearch.value) return

  submittedQuestion.value = question.value.trim()
}
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

      <section v-if="submittedQuestion" class="task-status" role="status">
        <p class="status-label">Mock Research Task 已创建</p>
        <p class="submitted-question">{{ submittedQuestion }}</p>
        <p class="field-hint">下一阶段才会生成 Research Plan 和执行真实研究。</p>
      </section>
    </section>
  </main>
</template>
