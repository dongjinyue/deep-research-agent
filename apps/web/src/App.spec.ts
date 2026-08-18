import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App.vue'
import { RESEARCH_TASK_STATUS_LABELS } from './research-task'

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

  it('defines labels for every lifecycle status', () => {
    expect(RESEARCH_TASK_STATUS_LABELS).toEqual({
      idle: '未开始',
      planning: '正在制定计划',
      researching: '正在研究',
      generating: '正在生成报告',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
    })
  })
})
