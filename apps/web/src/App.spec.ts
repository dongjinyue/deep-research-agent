import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App.vue'
import {
  createMockResearchTask,
  RESEARCH_TASK_STATUS_LABELS,
  transitionResearchTask,
} from './research-task'

afterEach(() => {
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
  })

  it('automatically advances the mock task through the successful lifecycle', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('研究大型 SaaS 的前端技术选型')
    await wrapper.get('form').trigger('submit')

    const expectedStatuses = [
      ['planning', '正在制定计划'],
      ['researching', '正在研究'],
      ['generating', '正在生成报告'],
      ['completed', '已完成'],
    ]

    for (const [index, [status, label]] of expectedStatuses.entries()) {
      if (index > 0) await vi.advanceTimersByTimeAsync(1000)

      expect(wrapper.get('[role="status"]').text()).toContain(status)
      expect(wrapper.get('[role="status"]').text()).toContain(label)
    }
  })

  it('moves a marked mock task directly to failed without starting normal progression', async () => {
    vi.useFakeTimers()
    const wrapper = mount(App)

    await wrapper.get('textarea').setValue('[mock:failed] 验证失败状态')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"]').text()).toContain('failed')
    expect(wrapper.get('[role="status"]').text()).toContain('失败')
    expect(wrapper.get('[role="status"]').text()).toContain('mock_research_failed')
    expect(wrapper.get('[role="status"]').text()).not.toContain('[mock:failed]')

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

  it('allows only declared research task status transitions', () => {
    const task = createMockResearchTask('验证状态转换')

    const researchingTask = transitionResearchTask(task, 'researching')

    expect(researchingTask.status).toBe('researching')
    expect(task.status).toBe('planning')
    expect(() => transitionResearchTask(task, 'completed')).toThrow(
      '不允许 Research Task 从 planning 转换为 completed',
    )
    expect(() => transitionResearchTask(task, 'failed')).toThrow(
      'Research Task 进入 failed 时必须提供结构化错误',
    )
  })
})
