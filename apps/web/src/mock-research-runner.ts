import {
  advanceMockResearchTask,
  createMockResearchTask,
  transitionResearchTask,
  type MockResearchTerminalStatus,
  type ResearchTask,
} from './research-task'
import type {
  ResearchRunHandle,
  ResearchRunner,
} from './research-task-service'

const MOCK_FAILED_MARKER = '[mock:failed]'
const MOCK_CANCELLED_MARKER = '[mock:cancelled]'
const MOCK_RESEARCH_FAILED_MARKER = '[mock:research-failed]'
const MOCK_RESEARCH_CANCELLED_MARKER = '[mock:research-cancelled]'

interface LocalMockInput {
  question: string
  terminalStatus?: MockResearchTerminalStatus
  executionTerminalStatus?: MockResearchTerminalStatus
}

interface MockResearchRunnerOptions {
  isDevelopment?: () => boolean
}

function parseLocalMockInput(rawQuestion: string): LocalMockInput {
  const normalizedQuestion = rawQuestion.trim()
  const terminalStatus = normalizedQuestion.includes(MOCK_FAILED_MARKER)
    ? 'failed'
    : normalizedQuestion.includes(MOCK_CANCELLED_MARKER)
      ? 'cancelled'
      : undefined
  const executionTerminalStatus = terminalStatus
    ? undefined
    : normalizedQuestion.includes(MOCK_RESEARCH_FAILED_MARKER)
      ? 'failed'
      : normalizedQuestion.includes(MOCK_RESEARCH_CANCELLED_MARKER)
        ? 'cancelled'
        : undefined

  return {
    question: normalizedQuestion
      .replaceAll(MOCK_FAILED_MARKER, '')
      .replaceAll(MOCK_CANCELLED_MARKER, '')
      .replaceAll(MOCK_RESEARCH_FAILED_MARKER, '')
      .replaceAll(MOCK_RESEARCH_CANCELLED_MARKER, '')
      .trim(),
    terminalStatus,
    executionTerminalStatus,
  }
}

function isTerminalTask(task: ResearchTask): boolean {
  return (
    task.status === 'completed' ||
    task.status === 'failed' ||
    task.status === 'cancelled'
  )
}

export function createMockResearchRunner(
  options: MockResearchRunnerOptions = {},
): ResearchRunner {
  const isDevelopment = options.isDevelopment ?? (() => import.meta.env.DEV)
  const prepareInput = (rawQuestion: string): LocalMockInput =>
    isDevelopment()
      ? parseLocalMockInput(rawQuestion)
      : { question: rawQuestion.trim() }

  return {
    normalizeQuestion(rawQuestion) {
      return prepareInput(rawQuestion).question
    },

    start(rawQuestion, onTaskChange) {
      const input = prepareInput(rawQuestion)
      let currentTask = createMockResearchTask(
        input.question,
        input.terminalStatus,
      )
      let stopped = false
      const timers: number[] = []

      const stop = () => {
        stopped = true
        // 页面销毁或新任务开始时，旧运行的计时器必须全部失效。
        timers.splice(0).forEach((timer) => window.clearTimeout(timer))
      }

      const scheduleAdvance = () => {
        const timer = window.setTimeout(() => {
          if (stopped || isTerminalTask(currentTask)) return

          const advancedTask = advanceMockResearchTask(currentTask)

          // 执行期终态在首个 Step 启动后立即触发，并保留当时的 Plan 快照。
          currentTask =
            input.executionTerminalStatus && advancedTask.status === 'researching'
              ? createExecutionTerminalTask(
                  advancedTask,
                  input.executionTerminalStatus,
                )
              : advancedTask
          onTaskChange(currentTask)

          if (!isTerminalTask(currentTask)) scheduleAdvance()
        }, 1000)

        timers.push(timer)
      }

      if (!isTerminalTask(currentTask)) scheduleAdvance()

      return {
        initialTask: currentTask,
        stop,
      } satisfies ResearchRunHandle
    },
  }
}

function createExecutionTerminalTask(
  task: ResearchTask,
  terminalStatus: MockResearchTerminalStatus,
): ResearchTask {
  return terminalStatus === 'failed'
    ? transitionResearchTask(task, 'failed', {
        error: {
          code: 'mock_research_execution_failed',
          message: '本地模拟研究执行失败',
          retryable: true,
        },
      })
    : transitionResearchTask(task, 'cancelled')
}
