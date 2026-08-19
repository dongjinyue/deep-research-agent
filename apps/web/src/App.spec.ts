import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import App from './App.vue'
import {
  advanceMockResearchTask,
  createMockResearchPlan,
  createMockResearchTask,
  RESEARCH_STEP_STATUS_LABELS,
  RESEARCH_TASK_STATUS_LABELS,
  transitionResearchTask,
  type ResearchPlan,
  type ResearchStepStatus,
  type ResearchTaskStatus,
} from './research-task'

afterEach(() => {
  // 每个用例恢复真实时钟，避免 fake timers 泄漏并影响后续测试。
  vi.useRealTimers()
})

describe('App', () => {
  it('renders the research question form and blocks an empty submission', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toBe('开始一次深度研究')
    expect(wrapper.get('textarea').attributes('placeholder')).toContain('Vue 和 React')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[role="status"]').text()).toContain('idle')
    expect(wrapper.get('[role="status"]').text()).toContain('未开始')
  })

  it('creates a mock research task from a non-empty question', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)
    const question = '  2026 年 AI Coding Agent 有哪些主要技术路线？  '

    await wrapper.get('textarea').setValue(question)
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"]').text()).toContain('planning')
    expect(wrapper.get('[role="status"]').text()).toContain('正在制定计划')
    expect(wrapper.get('[role="status"]').text()).toContain(question.trim())
    expect(wrapper.find('[aria-labelledby="research-plan-title"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('.plan-placeholder').text()).toContain('正在生成')
  })

  it('advances the task only after its plan exists and runs steps serially', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('研究大型 SaaS 的前端技术选型')
    await wrapper.get('form').trigger('submit')

    const expectedStates = [
      ['planning', []],
      ['researching', ['running', 'pending', 'pending']],
      ['researching', ['completed', 'running', 'pending']],
      ['researching', ['completed', 'completed', 'running']],
      ['generating', ['completed', 'completed', 'completed']],
      ['completed', ['completed', 'completed', 'completed']],
    ]

    // 用虚拟时间逐段验证 Task 与 Step 状态，测试无需真实等待。
    for (const [index, [status, stepStatuses]] of expectedStates.entries()) {
      if (index > 0) await vi.advanceTimersByTimeAsync(1000)

      expect(wrapper.get('[role="status"]').text()).toContain(status)
      expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual(
        stepStatuses,
      )
    }
  })

  it('moves a marked mock task directly to failed without starting normal progression', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('[mock:failed] 验证失败状态')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"]').text()).toContain('failed')
    expect(wrapper.get('[role="status"]').text()).toContain('失败')
    expect(wrapper.get('[role="status"]').text()).toContain(
      'mock_plan_generation_failed',
    )
    expect(wrapper.get('[role="status"]').text()).toContain('可重试')
    expect(wrapper.get('[role="status"]').text()).not.toContain('[mock:failed]')
    expect(wrapper.find('[aria-labelledby="research-plan-title"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('.plan-placeholder').text()).toContain('未生成')

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.get('[role="status"]').text()).toContain('failed')
    expect(wrapper.get('[role="status"]').text()).not.toContain('completed')
  })

  it('moves a cancelled mock task directly to cancelled without starting normal progression', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('[mock:cancelled] 验证取消状态')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"]').text()).toContain('cancelled')
    expect(wrapper.get('[role="status"]').text()).toContain('已取消')
    expect(wrapper.get('[role="status"]').text()).not.toContain('[mock:cancelled]')
    expect(wrapper.find('[aria-labelledby="research-plan-title"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('.plan-placeholder').text()).toContain('未生成')

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.get('[role="status"]').text()).toContain('cancelled')
    expect(wrapper.get('[role="status"]').text()).not.toContain('completed')
  })

  it('keeps failed precedence when both mock terminal markers are present', async () => {
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue('[mock:failed] [mock:cancelled] 验证终态优先级')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('failed')
  })

  it('does not create a task when local mock markers leave no research question', async () => {
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('[mock:failed] [mock:cancelled]')

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('idle')
  })

  it('defines labels for every lifecycle status', () => {
    expect(RESEARCH_TASK_STATUS_LABELS).toEqual({
      planning: '正在制定计划',
      researching: '正在研究',
      generating: '正在生成报告',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
    })
  })

  it('creates a compliant plan with complete fields and independent step statuses', () => {
    const plan = createMockResearchPlan(
      'mock-research-task-for-plan-test',
      '研究前端技术选型',
    )
    const anotherPlan = createMockResearchPlan(
      'mock-research-task-for-plan-test-2',
      '研究前端技术选型',
    )

    expect(plan.taskId).toBe('mock-research-task-for-plan-test')
    expect(anotherPlan.id).not.toBe(plan.id)
    expect(anotherPlan.steps.map((step) => step.id)).not.toEqual(
      plan.steps.map((step) => step.id),
    )
    expect(plan.steps.length).toBeGreaterThanOrEqual(3)
    expect(plan.steps.length).toBeLessThanOrEqual(6)
    expect(new Set(plan.steps.map((step) => step.id)).size).toBe(plan.steps.length)
    for (const step of plan.steps) {
      expect(step.id).not.toBe('')
      expect(step.title).not.toBe('')
      expect(step.description).not.toBe('')
      expect(step.status).toBe('pending')
    }
    expect(RESEARCH_STEP_STATUS_LABELS).toEqual({
      pending: '等待执行',
      running: '执行中',
      completed: '已完成',
    })
    expectTypeOf(plan).toEqualTypeOf<ResearchPlan>()
    expectTypeOf(plan.steps[0]!.status).toEqualTypeOf<ResearchStepStatus>()
    expectTypeOf<ResearchStepStatus>().not.toEqualTypeOf<ResearchTaskStatus>()
  })

  it('keeps Day 3 non-goals out of the plan UI', async () => {
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('验证 Day 3 范围')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('%')
    expect(wrapper.text()).not.toContain('重新生成')
    expect(wrapper.text()).not.toContain('编辑步骤')
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('keeps exactly one running step while researching', () => {
    let task = createMockResearchTask('验证串行步骤')

    expect(task.status).toBe('planning')
    expect(task.plan).toBeUndefined()

    task = advanceMockResearchTask(task)
    expect(task.status).toBe('researching')
    expect(task.plan?.steps.filter((step) => step.status === 'running')).toHaveLength(
      1,
    )

    task = advanceMockResearchTask(task)
    expect(task.plan?.steps.filter((step) => step.status === 'running')).toHaveLength(
      1,
    )
  })

  it('advances every successful state without mutating the source task', () => {
    const task = createMockResearchTask('验证状态转换')
    const researchingTask = advanceMockResearchTask(task)
    let generatingTask = researchingTask

    while (generatingTask.status === 'researching') {
      generatingTask = advanceMockResearchTask(generatingTask)
    }

    const completedTask = advanceMockResearchTask(generatingTask)

    expect(researchingTask.status).toBe('researching')
    expect(generatingTask.status).toBe('generating')
    expect(completedTask.status).toBe('completed')
    expect(task.status).toBe('planning')
  })

  it('allows active tasks to fail or be cancelled and keeps terminal states closed', () => {
    const planningTask = createMockResearchTask('验证终态转换')
    const researchingTask = advanceMockResearchTask(planningTask)
    let generatingTask = researchingTask

    while (generatingTask.status === 'researching') {
      generatingTask = advanceMockResearchTask(generatingTask)
    }

    const completedTask = transitionResearchTask(generatingTask, 'completed')
    const error = {
      code: 'test_failure',
      message: '测试失败',
      retryable: false,
    }

    // 三个进行中状态共享失败和取消规则，终态则必须保持关闭。
    for (const task of [planningTask, researchingTask, generatingTask]) {
      const failedTask = transitionResearchTask(task, 'failed', { error })
      const cancelledTask = transitionResearchTask(task, 'cancelled')

      expect(failedTask.error).toEqual(error)
      expect(cancelledTask.status).toBe('cancelled')
      expect(() => transitionResearchTask(failedTask, 'completed')).toThrow()
      expect(() => transitionResearchTask(cancelledTask, 'completed')).toThrow()
    }

    expect(() => transitionResearchTask(completedTask, 'cancelled')).toThrow()
  })

  it('rejects undeclared transitions and failed tasks without structured errors', () => {
    const task = createMockResearchTask('验证非法状态转换')

    expect(() => transitionResearchTask(task, 'researching')).toThrow(
      'Research Task 进入 researching 时必须拥有匹配的 Research Plan',
    )
    expect(() => transitionResearchTask(task, 'completed')).toThrow(
      '不允许 Research Task 从 planning 转换为 completed',
    )
    expect(() => transitionResearchTask(task, 'failed')).toThrow(
      'Research Task 进入 failed 时必须提供结构化错误',
    )
  })

  it('rejects an empty question at the mock task boundary', () => {
    expect(() => createMockResearchTask('   ')).toThrow(
      '创建 Research Task 时必须提供非空问题',
    )
  })
})
