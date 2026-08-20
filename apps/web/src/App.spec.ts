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
  // 恢复测试替身与环境，避免本地 Mock 开关或副作用监视泄漏到后续用例。
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
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

    expect(vi.getTimerCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.get('[role="status"] code').text()).toBe('completed')
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'completed',
      'completed',
      'completed',
    ])
  })

  it('completes the mock lifecycle without network or persistence side effects', async () => {
    vi.useFakeTimers()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response)
    const xhrOpenSpy = vi
      .spyOn(XMLHttpRequest.prototype, 'open')
      .mockImplementation(() => undefined)
    const storageSetItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined)
    const indexedDbOpenSpy =
      typeof globalThis.indexedDB === 'undefined'
        ? undefined
        : vi.spyOn(globalThis.indexedDB, 'open')
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('验证本地 Mock 生命周期')
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(5000)

    expect(wrapper.get('[role="status"] code').text()).toBe('completed')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrOpenSpy).not.toHaveBeenCalled()
    expect(storageSetItemSpy).not.toHaveBeenCalled()
    if (indexedDbOpenSpy) expect(indexedDbOpenSpy).not.toHaveBeenCalled()
  })

  it('does not let an old task timer advance a newly submitted task', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('第一个研究问题')
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(500)

    await wrapper.get('textarea').setValue('第二个研究问题')
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.get('[role="status"] code').text()).toBe('planning')
    expect(wrapper.get('[role="status"]').text()).toContain('第二个研究问题')

    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.get('[role="status"] code').text()).toBe('researching')
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])

    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
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

  it('freezes the plan when research execution fails after the first step starts', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue('[mock:research-failed] 验证执行期失败')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('planning')

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.get('[role="status"] code').text()).toBe('failed')
    expect(wrapper.get('[role="status"]').text()).toContain(
      'mock_research_execution_failed',
    )
    expect(wrapper.get('[role="status"]').text()).not.toContain(
      '[mock:research-failed]',
    )
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])
    expect(vi.getTimerCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.get('[role="status"] code').text()).toBe('failed')
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])
  })

  it('freezes the plan when research execution is cancelled after the first step starts', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue('[mock:research-cancelled] 验证执行期取消')
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.get('[role="status"] code').text()).toBe('cancelled')
    expect(wrapper.get('[role="status"]').text()).not.toContain(
      '[mock:research-cancelled]',
    )
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])
    expect(vi.getTimerCount()).toBe(0)

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.get('[role="status"] code').text()).toBe('cancelled')
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])
  })

  it('keeps failed precedence when both mock terminal markers are present', async () => {
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue('[mock:failed] [mock:cancelled] 验证终态优先级')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('failed')
  })

  it('keeps planning terminals ahead of research terminals and failed first per phase', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue('[mock:cancelled] [mock:research-failed] 验证阶段优先级')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('cancelled')

    await wrapper
      .get('textarea')
      .setValue(
        '[mock:research-failed] [mock:research-cancelled] 验证执行期优先级',
      )
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.get('[role="status"] code').text()).toBe('failed')
  })

  it('does not create a task when local mock markers leave no research question', async () => {
    const wrapper = mount(App)

    await wrapper
      .get('textarea')
      .setValue(
        '[mock:failed] [mock:cancelled] [mock:research-failed] [mock:research-cancelled]',
      )

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('idle')
  })

  it('treats local mock markers as ordinary question text outside development', async () => {
    vi.useFakeTimers()
    vi.stubEnv('DEV', false)
    const wrapper = mount(App)
    const question =
      '[mock:failed] [mock:cancelled] [mock:research-failed] [mock:research-cancelled] 生产问题'

    await wrapper.get('textarea').setValue(question)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"] code').text()).toBe('planning')
    expect(wrapper.get('[role="status"]').text()).toContain(question)

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.get('[role="status"] code').text()).toBe('researching')
    expect(wrapper.findAll('.step-status code').map((step) => step.text())).toEqual([
      'running',
      'pending',
      'pending',
    ])
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

  it('renders the fixed mock plan content and clearly discloses its mock scope', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)
    const question = '研究企业知识库方案'

    await wrapper.get('textarea').setValue(`  ${question}  `)
    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(1000)

    const steps = wrapper.findAll('.research-steps > li')

    expect(steps).toHaveLength(3)
    expect(steps.map((step) => step.get('h3').text())).toEqual([
      '明确研究范围',
      '收集并核验资料',
      '整理结论与引用',
    ])
    expect(steps.map((step) => step.get('p').text())).toEqual([
      `围绕“${question}”确认关键概念、比较维度和研究边界。`,
      '按研究维度收集资料，并交叉核验关键信息。',
      '基于已核验资料整理结论和可追溯引用。',
    ])
    expect(wrapper.get('.research-plan > .field-hint').text()).toContain(
      '前端固定 Mock 模板',
    )
    expect(wrapper.get('.summary').text()).toContain('不会调用真实研究服务')
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

  it('runs every step in plan order while preserving serial invariants', () => {
    let task = createMockResearchTask('验证串行步骤')

    expect(task.status).toBe('planning')
    expect(task.plan).toBeUndefined()

    const expectedStepStatuses: ResearchStepStatus[][] = [
      ['running', 'pending', 'pending'],
      ['completed', 'running', 'pending'],
      ['completed', 'completed', 'running'],
    ]

    for (const expectedStatuses of expectedStepStatuses) {
      task = advanceMockResearchTask(task)

      expect(task.status).toBe('researching')
      expect(task.plan?.steps.map((step) => step.status)).toEqual(expectedStatuses)
      expect(
        task.plan?.steps.filter((step) => step.status === 'running'),
      ).toHaveLength(1)
    }

    task = advanceMockResearchTask(task)
    expect(task.status).toBe('generating')
    expect(task.plan?.steps.map((step) => step.status)).toEqual([
      'completed',
      'completed',
      'completed',
    ])
    expect(task.plan?.steps.some((step) => step.status === 'running')).toBe(false)
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
      expect(() => advanceMockResearchTask(failedTask)).toThrow(
        '终态 Research Task failed 不能继续自动推进',
      )
      expect(() => advanceMockResearchTask(cancelledTask)).toThrow(
        '终态 Research Task cancelled 不能继续自动推进',
      )
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
