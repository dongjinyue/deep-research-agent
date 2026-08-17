import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('App', () => {
  it('renders the research question form and blocks an empty submission', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toBe('开始一次深度研究')
    expect(wrapper.get('textarea').attributes('placeholder')).toContain('Vue 和 React')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('creates a mock research task from a non-empty question', async () => {
    const wrapper = mount(App)
    const question = '  2026 年 AI Coding Agent 有哪些主要技术路线？  '

    await wrapper.get('textarea').setValue(question)
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="status"]').text()).toContain('Mock Research Task 已创建')
    expect(wrapper.get('[role="status"]').text()).toContain(question.trim())
  })
})
